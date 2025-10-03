"""
GAN-based Color Vision Deficiency Filter Generator

This module integrates the trained GAN model for generating color restoration filters
for people with color vision deficiency (CVD). The model uses a conditional GAN
architecture with the following components:

- ColorRestorationGenerator: Generates adaptive overlay filters based on CVD condition
- CVD condition vector: [protan_severity, deutan_severity, tritan_severity, has_cvd]
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
import os
from typing import Tuple, Dict, Optional, Union
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FiLM(nn.Module):
    """Feature-wise Linear Modulation for CVD condition injection"""
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.fc = nn.Linear(in_dim, out_dim * 2)
    
    def forward(self, x, c):
        gamma, beta = self.fc(c).chunk(2, dim=-1)
        return x * gamma.unsqueeze(-1).unsqueeze(-1) + beta.unsqueeze(-1).unsqueeze(-1)

class ColorAttention(nn.Module):
    """Attention mechanism for focusing on color-critical regions"""
    def __init__(self, in_channels):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, in_channels // 8, 1)
        self.conv2 = nn.Conv2d(in_channels // 8, 1, 1)
        
    def forward(self, x):
        attention = torch.sigmoid(self.conv2(F.relu(self.conv1(x))))
        return x * attention

class CVDResBlock(nn.Module):
    """Enhanced ResBlock with CVD-aware conditioning"""
    def __init__(self, in_ch, out_ch, cond_dim=4):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, 1, 1)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, 1, 1)
        self.norm1 = nn.GroupNorm(8, out_ch)
        self.norm2 = nn.GroupNorm(8, out_ch)
        self.film = FiLM(cond_dim, out_ch)
        self.attention = ColorAttention(out_ch)
        self.skip = nn.Conv2d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()
        self.dropout = nn.Dropout2d(0.1)
        
    def forward(self, x, c):
        h = F.relu(self.norm1(self.conv1(x)))
        h = self.film(h, c)
        h = self.dropout(h)
        h = self.norm2(self.conv2(h))
        h = self.attention(h)
        return F.relu(h + self.skip(x))

class ColorRestorationGenerator(nn.Module):
    """
    Generates overlay filters to restore color vision for CVD patients
    
    Architecture: ResUNet with FiLM conditioning and attention modules
    Input: CVD-affected image + condition vector [protan, deutan, tritan, has_cvd]
    Output: Restored image, overlay filter, blend weight
    """
    def __init__(self, cond_dim=4):
        super().__init__()
        
        # Condition embedding
        self.cond_embed = nn.Sequential(
            nn.Linear(cond_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 128),
            nn.ReLU(),
            nn.Linear(128, cond_dim * 16)
        )
        
        # Encoder - Extract features from CVD-affected image
        self.enc1 = CVDResBlock(3, 64, cond_dim * 16)
        self.enc2 = CVDResBlock(64, 128, cond_dim * 16)
        self.enc3 = CVDResBlock(128, 256, cond_dim * 16)
        self.pool = nn.MaxPool2d(2)
        
        # Bottleneck with global context
        self.bottleneck_resblock = CVDResBlock(256, 512, cond_dim * 16)
        self.bottleneck_pool = nn.AdaptiveAvgPool2d(1)
        self.bottleneck_conv1 = nn.Conv2d(512, 256, 1)
        self.bottleneck_conv2 = nn.Conv2d(256, 512, 1)
        
        # Decoder - Generate restoration filter
        self.upsample = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        self.dec3 = CVDResBlock(512 + 256, 256, cond_dim * 16)
        self.dec2 = CVDResBlock(256 + 128, 128, cond_dim * 16)
        self.dec1 = CVDResBlock(128 + 64, 64, cond_dim * 16)
        
        # Output layers for overlay filter generation
        self.filter_head = nn.Sequential(
            nn.Conv2d(64, 32, 3, 1, 1),
            nn.ReLU(),
            nn.Conv2d(32, 16, 3, 1, 1),
            nn.ReLU(),
            nn.Conv2d(16, 3, 1)
        )
        
        # Adaptive blend weight prediction
        self.blend_head = nn.Sequential(
            nn.Conv2d(64, 16, 3, 1, 1),
            nn.ReLU(),
            nn.Conv2d(16, 1, 1),
            nn.Sigmoid()
        )
        
    def forward(self, cvd_image, condition):
        """
        Args:
            cvd_image: CVD-affected input image [B, 3, H, W]
            condition: CVD condition vector [B, 4] = [protan, deutan, tritan, has_cvd]
        
        Returns:
            restored_image: Color-restored image [B, 3, H, W]
            overlay_filter: Generated overlay filter [B, 3, H, W]
            blend_weight: Adaptive blending weight [B, 1, H, W]
        """
        # Embed condition vector
        cond_emb = self.cond_embed(condition)
        
        # Encoder with skip connections
        e1 = self.enc1(cvd_image, cond_emb)
        e1_pool = self.pool(e1)
        
        e2 = self.enc2(e1_pool, cond_emb)
        e2_pool = self.pool(e2)
        
        e3 = self.enc3(e2_pool, cond_emb)
        e3_pool = self.pool(e3)
        
        # Bottleneck
        bottleneck = self.bottleneck_resblock(e3_pool, cond_emb)
        bottleneck = self.bottleneck_pool(bottleneck)
        bottleneck = F.relu(self.bottleneck_conv1(bottleneck))
        bottleneck = self.bottleneck_conv2(bottleneck)
        
        bottleneck_up = F.interpolate(bottleneck, size=e3.shape[2:], mode='bilinear', align_corners=False)
        
        # Decoder with skip connections
        d3 = self.dec3(torch.cat([bottleneck_up, e3], dim=1), cond_emb)
        d3_up = self.upsample(d3)
        
        d2 = self.dec2(torch.cat([d3_up, e2], dim=1), cond_emb)
        d2_up = self.upsample(d2)
        
        d1 = self.dec1(torch.cat([d2_up, e1], dim=1), cond_emb)
        
        # Generate overlay filter and blend weight
        overlay_filter = torch.tanh(self.filter_head(d1)) * 0.25  # Reduced from 0.5 to 0.25 (50% reduction)
        blend_weight = self.blend_head(d1)
        
        # Apply adaptive color restoration
        restored_image = cvd_image + blend_weight * overlay_filter
        restored_image = torch.clamp(restored_image, 0, 1)
        
        return restored_image, overlay_filter, blend_weight

class GANFilterGenerator:
    """
    High-level interface for GAN-based CVD filter generation
    """
    def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
        """
        Initialize the GAN filter generator
        
        Args:
            model_path: Path to the saved generator model (.pth file)
            device: Device to run the model on ('cuda', 'cpu', or None for auto)
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.generator = None
        self.model_loaded = False
        
        # Default model path
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))  # Go up to project root
            model_dir = os.path.join(base_dir, "models", "saved_models")
            model_files = [f for f in os.listdir(model_dir) if f.startswith('cvd_generator_') and f.endswith('.pth')]
            if model_files:
                model_path = os.path.join(model_dir, sorted(model_files)[-1])  # Use latest model
            else:
                raise FileNotFoundError(f"No generator model found in {model_dir}")
        
        self.model_path = model_path
        logger.info(f"Initializing GAN Filter Generator with device: {self.device}")
        
        # Load the model
        self._load_model()
    
    def _load_model(self):
        """Load the trained generator model"""
        try:
            logger.info(f"Loading model from: {self.model_path}")
            
            # Initialize generator
            self.generator = ColorRestorationGenerator(cond_dim=4).to(self.device)
            
            # Load saved state
            checkpoint = torch.load(self.model_path, map_location=self.device)
            self.generator.load_state_dict(checkpoint['model_state_dict'])
            self.generator.eval()
            
            self.model_loaded = True
            logger.info("GAN model loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def preprocess_image(self, image: Union[np.ndarray, str], target_size: Tuple[int, int] = (256, 256)) -> torch.Tensor:
        """
        Preprocess image for the GAN model
        
        Args:
            image: Input image as numpy array or file path
            target_size: Target size for the image (H, W)
        
        Returns:
            Preprocessed image tensor [1, 3, H, W]
        """
        # Load image if path is provided
        if isinstance(image, str):
            image = cv2.imread(image)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Ensure image is in correct format
        if image.dtype != np.float32:
            image = image.astype(np.float32) / 255.0
        
        # Resize image
        if image.shape[:2] != target_size:
            image = cv2.resize(image, target_size)
        
        # Convert to tensor [1, 3, H, W]
        image_tensor = torch.from_numpy(image).permute(2, 0, 1).unsqueeze(0).to(self.device)
        
        return image_tensor
    
    def create_condition_vector(self, 
                              protanopia_severity: float = 0.0,
                              deuteranopia_severity: float = 0.0, 
                              tritanopia_severity: float = 0.0) -> torch.Tensor:
        """
        Create CVD condition vector for the model
        
        Args:
            protanopia_severity: Severity of protanopia [0.0-1.0]
            deuteranopia_severity: Severity of deuteranopia [0.0-1.0]
            tritanopia_severity: Severity of tritanopia [0.0-1.0]
        
        Returns:
            Condition tensor [1, 4] = [protan, deutan, tritan, has_cvd]
        """
        has_cvd = 1.0 if (protanopia_severity > 0 or deuteranopia_severity > 0 or tritanopia_severity > 0) else 0.0
        
        condition = torch.tensor([
            protanopia_severity,
            deuteranopia_severity, 
            tritanopia_severity,
            has_cvd
        ], dtype=torch.float32).unsqueeze(0).to(self.device)
        
        return condition
    
    def generate_filter(self, 
                       image: Union[np.ndarray, str],
                       protanopia_severity: float = 0.0,
                       deuteranopia_severity: float = 0.0,
                       tritanopia_severity: float = 0.0,
                       return_intermediate: bool = False) -> Union[np.ndarray, Dict]:
        """
        Generate color restoration filter for the given image and CVD condition
        
        Args:
            image: Input image as numpy array or file path
            protanopia_severity: Severity of protanopia [0.0-1.0]
            deuteranopia_severity: Severity of deuteranopia [0.0-1.0] 
            tritanopia_severity: Severity of tritanopia [0.0-1.0]
            return_intermediate: If True, return all intermediate results
        
        Returns:
            If return_intermediate=False: Restored image as numpy array
            If return_intermediate=True: Dict with restored_image, overlay_filter, blend_weight
        """
        if not self.model_loaded:
            raise RuntimeError("Model not loaded. Please initialize the generator first.")
        
        try:
            # Preprocess image
            image_tensor = self.preprocess_image(image)
            original_shape = image_tensor.shape[2:]  # Store original shape for resizing back
            
            # Create condition vector
            condition = self.create_condition_vector(
                protanopia_severity, deuteranopia_severity, tritanopia_severity
            )
            
            # Generate restoration
            with torch.no_grad():
                restored_image, overlay_filter, blend_weight = self.generator(image_tensor, condition)
            
            # Convert back to numpy
            restored_np = restored_image.squeeze().permute(1, 2, 0).cpu().numpy()
            restored_np = np.clip(restored_np, 0, 1)
            
            if return_intermediate:
                overlay_np = overlay_filter.squeeze().permute(1, 2, 0).cpu().numpy()
                blend_np = blend_weight.squeeze().cpu().numpy()
                
                return {
                    'restored_image': restored_np,
                    'overlay_filter': overlay_np,
                    'blend_weight': blend_np,
                    'condition_vector': condition.squeeze().cpu().numpy()
                }
            else:
                return restored_np
                
        except Exception as e:
            logger.error(f"Error generating filter: {e}")
            raise
    
    def apply_filter_to_image(self, 
                             image: Union[np.ndarray, str],
                             cvd_results: Dict) -> np.ndarray:
        """
        Apply GAN-generated filter based on CVD test results
        
        Args:
            image: Input image as numpy array or file path
            cvd_results: CVD test results containing severity scores
        
        Returns:
            Filtered image as numpy array [0-1] float32
        """
        # Extract CVD severities from results
        protanopia_severity = cvd_results.get('protanopia', 0.0)
        deuteranopia_severity = cvd_results.get('deuteranopia', 0.0) 
        tritanopia_severity = cvd_results.get('tritanopia', 0.0)
        
        # Generate and apply filter
        restored_image = self.generate_filter(
            image=image,
            protanopia_severity=protanopia_severity,
            deuteranopia_severity=deuteranopia_severity,
            tritanopia_severity=tritanopia_severity
        )
        
        return restored_image
    
    def get_filter_recommendations(self, cvd_results: Dict) -> Dict:
        """
        Get filter recommendations based on CVD test results
        
        Args:
            cvd_results: CVD test results containing severity scores
        
        Returns:
            Dictionary with filter recommendations and parameters
        """
        protanopia_severity = cvd_results.get('protanopia', 0.0)
        deuteranopia_severity = cvd_results.get('deuteranopia', 0.0)
        tritanopia_severity = cvd_results.get('tritanopia', 0.0)
        
        # Determine primary CVD type
        max_severity = max(protanopia_severity, deuteranopia_severity, tritanopia_severity)
        
        if max_severity == 0:
            primary_type = "normal"
            filter_strength = "none"
        elif max_severity == protanopia_severity:
            primary_type = "protanopia"
        elif max_severity == deuteranopia_severity:
            primary_type = "deuteranopia"
        else:
            primary_type = "tritanopia"
        
        if max_severity > 0:
            if max_severity < 0.3:
                filter_strength = "mild"
            elif max_severity < 0.7:
                filter_strength = "moderate"
            else:
                filter_strength = "strong"
        
        return {
            'primary_cvd_type': primary_type,
            'filter_strength': filter_strength,
            'protanopia_severity': protanopia_severity,
            'deuteranopia_severity': deuteranopia_severity,
            'tritanopia_severity': tritanopia_severity,
            'max_severity': max_severity,
            'recommended_filter': f"GAN-based {primary_type} correction ({filter_strength})",
            'description': f"AI-generated color restoration filter for {primary_type} with {filter_strength} intensity"
        }

    def generate_filter_parameters(self, severity_scores: Dict) -> Optional[Dict]:
        """
        Generate CSS filter parameters using GAN analysis
        
        Args:
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Dictionary with CSS filter parameters optimized by GAN
        """
        if not self.model_loaded:
            logger.warning("GAN model not loaded, cannot generate filter parameters")
            return None
            
        try:
            protanopia_score = severity_scores.get("protanopia", 0.0)
            deuteranopia_score = severity_scores.get("deuteranopia", 0.0)
            tritanopia_score = severity_scores.get("tritanopia", 0.0)
            
            # Create condition vector for GAN
            has_cvd = 1.0 if max(protanopia_score, deuteranopia_score, tritanopia_score) > 0.1 else 0.0
            condition = torch.tensor([protanopia_score, deuteranopia_score, tritanopia_score, has_cvd]).to(self.device)
            
            # Use GAN to generate optimal filter parameters
            with torch.no_grad():
                # Create a dummy image tensor for parameter generation
                dummy_image = torch.randn(1, 3, 256, 256).to(self.device)
                
                # Pass through generator to get filter characteristics
                output = self.generator(dummy_image, condition)
                
                # Analyze output to determine optimal CSS filter parameters
                output_np = output.cpu().numpy().squeeze()
                
                # Calculate filter parameters based on GAN output characteristics
                mean_values = np.mean(output_np, axis=(1, 2))  # RGB channel means
                std_values = np.std(output_np, axis=(1, 2))    # RGB channel stds
                
                # Map GAN output to CSS filter parameters
                r_shift, g_shift, b_shift = mean_values
                r_var, g_var, b_var = std_values
                
                # Generate filter parameters based on GAN analysis
                return {
                    "protanopia_correction": min(protanopia_score * (1.0 + abs(r_shift - g_shift)) * 0.5, 1.0),  # Added 50% reduction
                    "deuteranopia_correction": min(deuteranopia_score * (1.0 + abs(g_shift - b_shift)) * 0.5, 1.0),  # Added 50% reduction
                    "tritanopia_correction": min(tritanopia_score * (1.0 + abs(b_shift - r_shift)) * 0.5, 1.0),  # Added 50% reduction
                    "brightness_adjustment": 1.0 + np.mean(mean_values) * 0.15,  # Reduced from 0.3 to 0.15 (50% reduction)
                    "contrast_adjustment": 1.0 + np.mean(std_values) * 0.25,  # Reduced from 0.5 to 0.25 (50% reduction)
                    "saturation_adjustment": 1.0 + (protanopia_score + deuteranopia_score) * 0.3,  # Reduced from 0.6 to 0.3 (50% reduction)
                    "hue_rotation": (r_shift - b_shift) * 15.0,  # Reduced from 30.0 to 15.0 (50% reduction)
                    "sepia_amount": protanopia_score * 0.15  # Reduced from 0.3 to 0.15 (50% reduction)
                }
                
        except Exception as e:
            logger.error(f"Error generating GAN filter parameters: {e}")
            return None

# Global instance for easy access
_gan_filter_generator = None

def get_gan_filter_generator() -> GANFilterGenerator:
    """Get or create the global GAN filter generator instance"""
    global _gan_filter_generator
    if _gan_filter_generator is None:
        _gan_filter_generator = GANFilterGenerator()
    return _gan_filter_generator

def apply_gan_filter(image: Union[np.ndarray, str], cvd_results: Dict) -> np.ndarray:
    """
    Convenient function to apply GAN filter to an image
    
    Args:
        image: Input image as numpy array or file path
        cvd_results: CVD test results containing severity scores
    
    Returns:
        Filtered image as numpy array [0-1] float32
    """
    generator = get_gan_filter_generator()
    return generator.apply_filter_to_image(image, cvd_results)

if __name__ == "__main__":
    # Test the GAN filter generator
    try:
        # Initialize generator
        generator = GANFilterGenerator()
        print("✅ GAN Filter Generator initialized successfully!")
        
        # Test condition creation
        condition = generator.create_condition_vector(
            protanopia_severity=0.8,
            deuteranopia_severity=0.0,
            tritanopia_severity=0.0
        )
        print(f"✅ Condition vector created: {condition}")
        
        # Test filter recommendations
        test_results = {
            'protanopia': 0.7,
            'deuteranopia': 0.2, 
            'tritanopia': 0.1
        }
        recommendations = generator.get_filter_recommendations(test_results)
        print(f"✅ Filter recommendations: {recommendations}")
        
        print("🎉 All tests passed! GAN Filter Generator is ready for use.")
        
    except Exception as e:
        print(f"❌ Error testing GAN Filter Generator: {e}")