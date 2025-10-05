"""
Color Vision Deficiency utilities using GAN-based filter generation and basic OpenCV/NumPy
This module provides functionality for:
1. Applying color vision deficiency filters to images
2. Generating test images for CVD detection
3. Creating correction filters based on test results
4. GAN-based intelligent filter generation
"""

import numpy as np
import cv2
from PIL import Image
import base64
from io import BytesIO
from typing import Tuple, Dict, List, Optional
import random
import os
import logging

# Import GAN filter generator
try:
    from gan_filter_generator import GANFilterGenerator, get_gan_filter_generator
    GAN_AVAILABLE = True
    logging.info("GAN Filter Generator available")
except ImportError as e:
    GAN_AVAILABLE = False
    logging.warning(f"GAN Filter Generator not available: {e}")

class ColorVisionProcessor:
    """Main class for processing color vision deficiency operations with GAN integration"""
    
    def __init__(self):
        # Improved CVD simulation matrices for more accurate color vision deficiency testing
        # Based on Viénot et al. (1999) and optimized for distinguishing red-green and blue-yellow confusion
        
        # Protanopia (missing L-cones) - red-blind
        self.protanopia_matrix = np.array([
            [0.152286, 1.052583, -0.204868],
            [0.114503, 0.786281, 0.099216],
            [-0.003882, -0.048116, 1.051998]
        ])
        
        # Deuteranopia (missing M-cones) - green-blind  
        self.deuteranopia_matrix = np.array([
            [0.367322, 0.860646, -0.227968],
            [0.280085, 0.672501, 0.047413],
            [-0.011820, 0.042940, 0.968881]
        ])
        
        # Tritanopia (missing S-cones) - blue-blind
        self.tritanopia_matrix = np.array([
            [1.255528, -0.076749, -0.178779],
            [-0.078411, 0.930809, 0.147602],
            [0.004733, 0.691367, 0.303900]
        ])
        
        # Initialize GAN filter generator if available
        self.gan_generator = None
        if GAN_AVAILABLE:
            try:
                self.gan_generator = get_gan_filter_generator()
                logging.info("GAN Filter Generator initialized successfully")
            except Exception as e:
                logging.error(f"Failed to initialize GAN Filter Generator: {e}")
                self.gan_generator = None
        
    def apply_cvd_filter(self, image_array: np.ndarray, deficiency_type: str, severity: float = 1.0) -> np.ndarray:
        """
        Apply color vision deficiency filter to an image with increased intensity
        
        Args:
            image_array: Input image as numpy array (RGB)
            deficiency_type: Type of CVD ('protanopia', 'deuteranopia', 'tritanopia')
            severity: Severity of the deficiency (0.0 to 1.0)
            
        Returns:
            Filtered image as numpy array
        """
        if deficiency_type == 'protanopia':
            transform_matrix = self.protanopia_matrix
        elif deficiency_type == 'deuteranopia':
            transform_matrix = self.deuteranopia_matrix
        elif deficiency_type == 'tritanopia':
            transform_matrix = self.tritanopia_matrix
        else:
            raise ValueError(f"Unknown deficiency type: {deficiency_type}")
        
        # Ensure input is valid
        if image_array is None or image_array.size == 0:
            raise ValueError("Input image is empty or None")
        
        # Normalize image to 0-1 range with proper validation
        if image_array.dtype != np.uint8:
            image_array = np.clip(image_array, 0, 255).astype(np.uint8)
        
        normalized_image = image_array.astype(np.float32) / 255.0
        
        # Validate image dimensions
        if len(normalized_image.shape) != 3 or normalized_image.shape[2] != 3:
            raise ValueError("Input image must be a 3-channel RGB image")
        
        # Apply increased severity for more noticeable effects
        severity = min(1.0, severity * 2.0)  # Double the intensity for more noticeable effects
        
        # Reshape for matrix multiplication
        h, w, c = normalized_image.shape
        reshaped = normalized_image.reshape(-1, 3)
        
        # Apply transformation matrix with proper error handling
        try:
            transformed = np.dot(reshaped, transform_matrix.T)
        except Exception as e:
            logging.error(f"Matrix multiplication error: {e}")
            return image_array  # Return original on error
        
        # Apply severity (interpolate between original and transformed)
        if severity < 1.0:
            transformed = (1 - severity) * reshaped + severity * transformed
        else:
            # For full severity, use the transformation completely
            pass
        
        # Reshape back and convert to uint8 with proper clipping
        filtered_image = transformed.reshape(h, w, c)
        
        # Ensure values are in valid range and handle NaN/inf
        filtered_image = np.nan_to_num(filtered_image, nan=0.0, posinf=1.0, neginf=0.0)
        filtered_image = np.clip(filtered_image * 255, 0, 255).astype(np.uint8)
        
        return filtered_image
    
    def generate_test_image_pair(self, base_image_path: str, deficiency_type: str) -> Tuple[str, str]:
        """
        Generate a pair of images (original and CVD-filtered) for testing
        
        Args:
            base_image_path: Path to the base test image
            deficiency_type: Type of CVD to simulate
            
        Returns:
            Tuple of (original_base64, filtered_base64)
        """
        # Load the base image
        image = cv2.imread(base_image_path)
        if image is None:
            raise ValueError(f"Could not load image from {base_image_path}")
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Apply CVD filter
        filtered_image = self.apply_cvd_filter(image_rgb, deficiency_type)
        
        # Convert to base64 strings
        original_b64 = self._image_to_base64(image_rgb)
        filtered_b64 = self._image_to_base64(filtered_image)
        
        return original_b64, filtered_b64
    
    def generate_identical_test_pair(self, base_image_path: str, deficiency_type: str) -> Tuple[str, str]:
        """
        Generate a pair of identical images for testing (both should look the same)
        
        Args:
            base_image_path: Path to the base test image
            deficiency_type: Type of CVD (for context, but both images will be the same)
            
        Returns:
            Tuple of (original_base64, identical_base64)
        """
        # Load the base image
        image = cv2.imread(base_image_path)
        if image is None:
            raise ValueError(f"Could not load image from {base_image_path}")
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # For identical pairs, we'll use the same image twice
        # But add slight variations that wouldn't be visible to someone with CVD
        image1 = image_rgb.copy()
        image2 = image_rgb.copy()
        
        # Add very subtle differences that normal vision can detect but CVD cannot
        # This makes the test more realistic
        if deficiency_type in ['protanopia', 'deuteranopia']:
            # Slightly adjust red/green values in small areas
            image2[50:100, 50:100, 0] = np.clip(image2[50:100, 50:100, 0] + 10, 0, 255)  # Red
            image2[100:150, 100:150, 1] = np.clip(image2[100:150, 100:150, 1] + 10, 0, 255)  # Green
        elif deficiency_type == 'tritanopia':
            # Slightly adjust blue/yellow values
            image2[50:100, 50:100, 2] = np.clip(image2[50:100, 50:100, 2] + 10, 0, 255)  # Blue
        
        # Convert to base64 strings
        original_b64 = self._image_to_base64(image1)
        identical_b64 = self._image_to_base64(image2)
        
        return original_b64, identical_b64
    
    def generate_cvd_confusion_pair(self, base_image_path: str, deficiency_type: str) -> Tuple[str, str]:
        """
        Generate a pair of images that look the same to someone with CVD but different to normal vision
        
        Args:
            base_image_path: Path to the base test image
            deficiency_type: Type of CVD to create confusion for
            
        Returns:
            Tuple of (original_base64, cvd_confusion_base64)
        """
        # Load the base image
        image = cv2.imread(base_image_path)
        if image is None:
            raise ValueError(f"Could not load image from {base_image_path}")
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Create original image
        original_image = image_rgb.copy()
        
        # Create confusion image with colors that CVD users cannot distinguish
        confusion_image = image_rgb.copy()
        
        if deficiency_type in ['protanopia', 'deuteranopia']:
            # Red-green confusion: Replace certain red areas with green that looks the same to CVD
            # Target areas with higher red values
            red_mask = (confusion_image[:, :, 0] > 120) & (confusion_image[:, :, 1] < 100)
            
            # Convert red to a green that appears the same to red-green CVD
            confusion_image[red_mask, 0] = confusion_image[red_mask, 0] * 0.3  # Reduce red
            confusion_image[red_mask, 1] = confusion_image[red_mask, 1] * 1.4  # Increase green
            
            # Add subtle green patches that CVD users can't distinguish from existing colors
            h, w = confusion_image.shape[:2]
            for _ in range(5):
                x = random.randint(0, w-50)
                y = random.randint(0, h-50)
                # Create a patch that normal vision sees as different but CVD sees as same
                confusion_image[y:y+30, x:x+30, 0] = np.clip(confusion_image[y:y+30, x:x+30, 0] * 0.7, 0, 255)
                confusion_image[y:y+30, x:x+30, 1] = np.clip(confusion_image[y:y+30, x:x+30, 1] * 1.3, 0, 255)
                
        elif deficiency_type == 'tritanopia':
            # Blue-yellow confusion
            blue_mask = (confusion_image[:, :, 2] > 120) & (confusion_image[:, :, 0] < 100)
            
            # Convert blue to yellow that appears the same to blue-yellow CVD
            confusion_image[blue_mask, 2] = confusion_image[blue_mask, 2] * 0.4  # Reduce blue
            confusion_image[blue_mask, 0] = confusion_image[blue_mask, 0] * 1.2  # Increase red (for yellow)
            confusion_image[blue_mask, 1] = confusion_image[blue_mask, 1] * 1.2  # Increase green (for yellow)
        
        # Convert to base64 strings
        original_b64 = self._image_to_base64(original_image)
        confusion_b64 = self._image_to_base64(confusion_image)
        
        return original_b64, confusion_b64
    
    def _image_to_base64(self, image_array: np.ndarray) -> str:
        """Convert numpy array image to base64 string"""
        image_pil = Image.fromarray(image_array.astype(np.uint8))
        buffer = BytesIO()
        image_pil.save(buffer, format='JPEG', quality=90)
        image_b64 = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/jpeg;base64,{image_b64}"
    
    def _base64_to_image(self, base64_string: str) -> np.ndarray:
        """Convert base64 string to numpy array image"""
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image_pil = Image.open(BytesIO(image_data))
        return np.array(image_pil)
    
    def apply_gan_correction_filter(self, image_data: str, severity_scores: Dict) -> Optional[str]:
        """
        Apply GAN-based color correction filter to an image
        
        Args:
            image_data: Base64 encoded image data
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Base64 encoded corrected image or None if GAN not available
        """
        if not self.gan_generator:
            logging.warning("GAN Filter Generator not available, falling back to traditional methods")
            return None
            
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1] if ',' in image_data else image_data)
            image = Image.open(BytesIO(image_bytes))
            image_rgb = np.array(image.convert('RGB'))
            
            # Normalize to [0,1] for GAN model
            image_normalized = image_rgb.astype(np.float32) / 255.0
            
            # Apply GAN filter
            corrected_image = self.gan_generator.apply_filter_to_image(
                image_normalized, severity_scores
            )
            
            # Convert back to [0,255] and uint8
            corrected_image = (corrected_image * 255).astype(np.uint8)
            corrected_image = np.clip(corrected_image, 0, 255)
            
            # Convert to PIL Image and encode as base64
            corrected_pil = Image.fromarray(corrected_image)
            buffer = BytesIO()
            corrected_pil.save(buffer, format='PNG')
            
            corrected_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{corrected_base64}"
            
        except Exception as e:
            logging.error(f"Error applying GAN correction filter: {e}")
            return None
    
    def get_gan_filter_recommendations(self, severity_scores: Dict) -> Optional[Dict]:
        """
        Get GAN-based filter recommendations
        
        Args:
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Filter recommendations or None if GAN not available
        """
        if not self.gan_generator:
            return None
            
        try:
            return self.gan_generator.get_filter_recommendations(severity_scores)
        except Exception as e:
            logging.error(f"Error getting GAN filter recommendations: {e}")
            return None
    
    def apply_hybrid_correction_filter(self, image_data: str, severity_scores: Dict, use_gan: bool = True) -> str:
        """
        Apply correction filter using GAN if available, fallback to traditional methods
        
        Args:
            image_data: Base64 encoded image data
            severity_scores: Dictionary with CVD severity scores
            use_gan: Whether to try GAN first (default: True)
            
        Returns:
            Base64 encoded corrected image
        """
        # Try GAN filter first if requested and available
        if use_gan and self.gan_generator:
            gan_result = self.apply_gan_correction_filter(image_data, severity_scores)
            if gan_result:
                logging.info("Applied GAN-based correction filter")
                return gan_result
            else:
                logging.warning("GAN filter failed, falling back to traditional methods")
        
        # Fallback to traditional filter methods
        logging.info("Applying traditional correction filter")
        return self.apply_traditional_correction_filter(image_data, severity_scores)
    
    def apply_traditional_correction_filter(self, image_data: str, severity_scores: Dict) -> str:
        """
        Apply traditional correction filter (existing method renamed for clarity)
        
        Args:
            image_data: Base64 encoded image data
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Base64 encoded corrected image
        """
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1] if ',' in image_data else image_data)
            image = Image.open(BytesIO(image_bytes))
            image_rgb = np.array(image.convert('RGB')).astype(np.float32) / 255.0
            
            # Get filter parameters
            filter_params = self.generate_correction_filter(severity_scores)
            
            # Apply corrections based on severity scores
            corrected = image_rgb.copy()
            
            # Enhanced protanopia correction (red-green issues)
            if severity_scores.get('protanopia', 0) > 0:
                intensity = filter_params['protanopia_correction'] * 1.0  # Reduced from 2.0 to 1.0 (50% reduction)
                # Enhance red channel separation
                corrected[:, :, 0] = np.clip(corrected[:, :, 0] * (1.0 + intensity), 0, 1)
                # Apply orange-red shift to improve red perception
                red_mask = corrected[:, :, 0] > corrected[:, :, 1]
                corrected[red_mask, 1] *= (1.0 + intensity * 0.15)  # Reduced from 0.3 to 0.15 (50% reduction)
            
            # Enhanced deuteranopia correction (green issues)
            if severity_scores.get('deuteranopia', 0) > 0:
                intensity = filter_params['deuteranopia_correction'] * 0.75  # Reduced from 1.5 to 0.75 (50% reduction)
                # Boost green channel differentiation
                corrected[:, :, 1] = np.clip(corrected[:, :, 1] * (1.0 + intensity), 0, 1)
                # Add subtle blue shift for green perception
                green_areas = corrected[:, :, 1] > np.maximum(corrected[:, :, 0], corrected[:, :, 2])
                corrected[green_areas, 2] *= (1.0 + intensity * 0.1)  # Reduced from 0.2 to 0.1 (50% reduction)
            
            # Enhanced tritanopia correction (blue-yellow issues)
            if severity_scores.get('tritanopia', 0) > 0:
                intensity = filter_params['tritanopia_correction'] * 1.0  # Reduced from 2.0 to 1.0 (50% reduction)
                # Enhance blue-yellow discrimination
                corrected[:, :, 2] = np.clip(corrected[:, :, 2] * (1.0 + intensity), 0, 1)
                # Apply yellow enhancement
                yellow_areas = (corrected[:, :, 0] > 0.5) & (corrected[:, :, 1] > 0.5) & (corrected[:, :, 2] < 0.3)
                corrected[yellow_areas, 0] *= (1.0 + intensity * 0.2)  # Reduced from 0.4 to 0.2 (50% reduction)
                corrected[yellow_areas, 1] *= (1.0 + intensity * 0.2)  # Reduced from 0.4 to 0.2 (50% reduction)
            
            # Apply global adjustments
            corrected = self._apply_global_adjustments(
                corrected, 
                filter_params['brightness_adjustment'],
                filter_params['contrast_adjustment'], 
                filter_params['saturation_adjustment']
            )
            
            # Ensure values are in valid range and convert back to uint8
            corrected = np.clip(corrected * 255, 0, 255).astype(np.uint8)
            
            # Convert to PIL Image and encode as base64
            corrected_image = Image.fromarray(corrected)
            buffer = BytesIO()
            corrected_image.save(buffer, format='PNG')
            
            corrected_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{corrected_base64}"
            
        except Exception as e:
            logging.error(f"Error applying traditional correction filter: {e}")
            # Return original image in case of error
            return image_data
    
    def _apply_global_adjustments(self, 
                                image: np.ndarray, 
                                brightness: float, 
                                contrast: float, 
                                saturation: float) -> np.ndarray:
        """
        Apply global brightness, contrast, and saturation adjustments
        
        Args:
            image: Input image as numpy array [0-1] float32
            brightness: Brightness adjustment factor (1.0 = no change)
            contrast: Contrast adjustment factor (1.0 = no change)
            saturation: Saturation adjustment factor (1.0 = no change)
        
        Returns:
            Adjusted image as numpy array [0-1] float32
        """
        try:
            adjusted = image.copy()
            
            # Apply brightness adjustment
            adjusted = adjusted * brightness
            
            # Apply contrast adjustment (around 0.5 midpoint)
            adjusted = (adjusted - 0.5) * contrast + 0.5
            
            # Apply saturation adjustment
            if saturation != 1.0:
                # Convert to grayscale for saturation adjustment
                gray = np.dot(adjusted, [0.299, 0.587, 0.114])
                gray = np.stack([gray, gray, gray], axis=-1)
                # Blend between grayscale and color
                adjusted = gray + saturation * (adjusted - gray)
            
            # Ensure values stay in valid range
            adjusted = np.clip(adjusted, 0.0, 1.0)
            
            return adjusted
            
        except Exception as e:
            logging.error(f"Error applying global adjustments: {e}")
            return image
    
    def generate_realtime_filter_params(self, severity_scores: Dict) -> Optional[Dict]:
        """
        Generate real-time filter parameters using GAN if available, fallback to traditional
        
        Args:
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Filter parameters or None if failed
        """
        if self.gan_generator:
            try:
                return self.gan_generator.get_filter_recommendations(severity_scores)
            except Exception as e:
                logging.error(f"GAN filter generation failed: {e}")
        
        # Fallback to traditional parameters
        return self.generate_traditional_filter_params(severity_scores)
    
    def generate_traditional_filter_params(self, severity_scores: Dict) -> Dict:
        """
        Generate traditional filter parameters based on severity scores
        
        Args:
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Traditional filter parameters
        """
        import time
        
        # Extract numeric severity scores
        protanopia = severity_scores.get('protanopia', 0)
        deuteranopia = severity_scores.get('deuteranopia', 0)
        tritanopia = severity_scores.get('tritanopia', 0)
        
        max_severity = max(protanopia, deuteranopia, tritanopia)
        
        return {
            'protanopia_correction': protanopia * 0.8,  # Increased from 0.4 to 0.8
            'deuteranopia_correction': deuteranopia * 0.8,  # Increased from 0.4 to 0.8
            'tritanopia_correction': tritanopia * 0.8,  # Increased from 0.4 to 0.8
            'brightness_adjustment': 1.0 + (max_severity * 0.1),  # Increased from 0.05 to 0.1
            'contrast_adjustment': 1.0 + (max_severity * 0.15),  # Increased from 0.075 to 0.15
            'saturation_adjustment': 1.0 + (max_severity * 0.2),  # Increased from 0.1 to 0.2
            'filter_type': 'traditional',
            'created_at': f"{time.time()}"
        }

class ColorVisionTestGenerator:
    """Generates test questions for color vision deficiency assessment"""
    
    def __init__(self, test_images_dir: str = "data/test_images"):
        self.test_images_dir = test_images_dir
        self.processor = ColorVisionProcessor()
        
        # Initialize image download service first
        try:
            from image_download_service import get_image_download_service
            self.image_downloader = get_image_download_service()
        except ImportError:
            logging.warning("Image download service not available")
            self.image_downloader = None
        
        self.ensure_test_images_exist()
    
    def ensure_test_images_exist(self):
        """Ensure test images directory and sample images exist"""
        os.makedirs(self.test_images_dir, exist_ok=True)
        
        # Check if we have enough variety of images
        existing_images = [f for f in os.listdir(self.test_images_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        downloaded_images = [f for f in existing_images if f.startswith('downloaded_test_image_')]
        
        # Download real images if we don't have enough or if we only have generated patterns
        if len(downloaded_images) < 15:
            logging.info("Downloading real-world test images for better CVD testing...")
            if self.image_downloader:
                try:
                    self.image_downloader.download_test_images(20, self.test_images_dir)
                except Exception as e:
                    logging.error(f"Failed to download test images: {e}")
                    # Fallback to generated patterns
                    if len(existing_images) == 0:
                        self.generate_basic_test_images()
            else:
                # Fallback to generated patterns if download service unavailable
                if len(existing_images) == 0:
                    self.generate_basic_test_images()
        
        # Generate some basic test patterns if we still don't have enough images
        if len(os.listdir(self.test_images_dir)) == 0:
            self.generate_basic_test_images()
    
    def generate_basic_test_images(self):
        """Generate basic color test images using simple patterns"""
        patterns = [
            self._create_ishihara_like_pattern(),
            self._create_color_gradient_pattern(),
            self._create_dot_pattern(),
            self._create_stripe_pattern(),
            self._create_checkerboard_pattern()
        ]
        
        for i, pattern in enumerate(patterns):
            image_path = os.path.join(self.test_images_dir, f"test_pattern_{i+1}.jpg")
            cv2.imwrite(image_path, cv2.cvtColor(pattern, cv2.COLOR_RGB2BGR))
    
    def _create_ishihara_like_pattern(self) -> np.ndarray:
        """Create a more realistic Ishihara-like dot pattern that properly tests CVD"""
        image = np.zeros((400, 400, 3), dtype=np.uint8)
        
        # Scientifically designed color pairs that are confusing for different CVD types
        # These colors are chosen to be distinguishable by normal vision but similar to CVD
        
        # For red-green colorblindness (protanopia/deuteranopia)
        confusion_pairs = [
            # Background: green tones, Hidden pattern: red tones
            {
                'background': [(85, 130, 85), (95, 140, 95), (105, 150, 105), (75, 120, 75)],
                'pattern': [(130, 85, 85), (140, 95, 95), (150, 105, 105), (120, 75, 75)]
            },
            # Background: brown-green, Hidden pattern: red-brown
            {
                'background': [(120, 140, 90), (110, 130, 80), (130, 150, 100), (100, 120, 70)],
                'pattern': [(140, 120, 90), (130, 110, 80), (150, 130, 100), (120, 100, 70)]
            }
        ]
        
        # Select a random confusion pair
        colors = random.choice(confusion_pairs)
        background_colors = colors['background']
        pattern_colors = colors['pattern']
        
        # Fill background with varied-size dots to mimic Ishihara plates
        for _ in range(1200):
            x, y = random.randint(0, 399), random.randint(0, 399)
            radius = random.randint(5, 20)
            color = random.choice(background_colors)
            # Add natural color variation
            color = [
                np.clip(color[0] + random.randint(-15, 15), 0, 255),
                np.clip(color[1] + random.randint(-15, 15), 0, 255),
                np.clip(color[2] + random.randint(-15, 15), 0, 255)
            ]
            # Convert to tuple of integers for OpenCV
            color = tuple(int(c) for c in color)
            cv2.circle(image, (x, y), radius, color, -1)
        
        # Create hidden pattern - a simple shape that CVD users cannot see
        center_x, center_y = 200, 200
        
        # Draw a circle pattern that's visible to normal vision but hidden to CVD
        for angle in range(0, 360, 12):
            # Main circle
            x = center_x + int(60 * np.cos(np.radians(angle)))
            y = center_y + int(60 * np.sin(np.radians(angle)))
            if 0 <= x < 400 and 0 <= y < 400:
                radius = random.randint(8, 16)
                color = random.choice(pattern_colors)
                # Add slight variation to make it more natural
                color = [
                    np.clip(color[0] + random.randint(-10, 10), 0, 255),
                    np.clip(color[1] + random.randint(-10, 10), 0, 255),
                    np.clip(color[2] + random.randint(-10, 10), 0, 255)
                ]
                color = tuple(int(c) for c in color)
                cv2.circle(image, (x, y), radius, color, -1)
        
        # Add inner pattern for more complexity
        for angle in range(0, 360, 20):
            x = center_x + int(30 * np.cos(np.radians(angle)))
            y = center_y + int(30 * np.sin(np.radians(angle)))
            if 0 <= x < 400 and 0 <= y < 400:
                radius = random.randint(6, 12)
                color = random.choice(pattern_colors)
                color = tuple(int(c) for c in color)
                cv2.circle(image, (x, y), radius, color, -1)
        
        return image
    
    def _create_color_gradient_pattern(self) -> np.ndarray:
        """Create a color gradient pattern"""
        image = np.zeros((400, 400, 3), dtype=np.uint8)
        
        for y in range(400):
            for x in range(400):
                # Create red-green gradient
                red = int(255 * (x / 400))
                green = int(255 * (1 - x / 400))
                blue = int(100 * (y / 400))
                image[y, x] = [red, green, blue]
        
        return image
    
    def _create_dot_pattern(self) -> np.ndarray:
        """Create a pattern with colored dots"""
        image = np.full((400, 400, 3), [240, 240, 240], dtype=np.uint8)
        
        colors = [
            [255, 100, 100],  # Red
            [100, 255, 100],  # Green  
            [100, 100, 255],  # Blue
            [255, 255, 100],  # Yellow
        ]
        
        for _ in range(200):
            x, y = random.randint(20, 379), random.randint(20, 379)
            radius = random.randint(8, 12)
            color = random.choice(colors)
            color = tuple(int(c) for c in color)
            cv2.circle(image, (x, y), radius, color, -1)
        
        return image
    
    def _create_stripe_pattern(self) -> np.ndarray:
        """Create a stripe pattern with different colors"""
        image = np.zeros((400, 400, 3), dtype=np.uint8)
        
        stripe_width = 20
        colors = [
            [255, 0, 0],    # Red
            [0, 255, 0],    # Green
            [0, 0, 255],    # Blue
            [255, 255, 0],  # Yellow
        ]
        
        for x in range(0, 400, stripe_width):
            color = colors[(x // stripe_width) % len(colors)]
            image[:, x:x+stripe_width] = color
        
        return image
    
    def _create_checkerboard_pattern(self) -> np.ndarray:
        """Create a checkerboard pattern with colors"""
        image = np.zeros((400, 400, 3), dtype=np.uint8)
        
        square_size = 40
        color1 = [255, 100, 100]  # Light red
        color2 = [100, 255, 100]  # Light green
        
        for y in range(0, 400, square_size):
            for x in range(0, 400, square_size):
                if ((x // square_size) + (y // square_size)) % 2 == 0:
                    color = color1
                else:
                    color = color2
                
                image[y:y+square_size, x:x+square_size] = color
        
        return image
    
    def generate_test_questions(self, count: int = 10) -> List[Dict]:
        """
        Generate a set of test questions for CVD assessment with downloaded real-world images
        
        Args:
            count: Number of questions to generate (default: 10)
            
        Returns:
            List of test questions with original and filtered images
        """
        questions = []
        
        # Get all available test images
        all_images = [f for f in os.listdir(self.test_images_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        
        # Prioritize downloaded real-world images over generated patterns
        downloaded_images = [f for f in all_images if f.startswith('downloaded_test_image_')]
        pattern_images = [f for f in all_images if f.startswith('test_pattern_')]
        
        # Use downloaded images first, then patterns if needed
        test_images = downloaded_images + pattern_images
        
        if not test_images:
            # Last resort: try to download images now
            if self.image_downloader:
                try:
                    self.image_downloader.download_test_images(10, self.test_images_dir)
                    test_images = [f for f in os.listdir(self.test_images_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
                except Exception as e:
                    logging.error(f"Emergency image download failed: {e}")
            
            if not test_images:
                raise ValueError("No test images available. Please check image download service or generate basic patterns.")
        
        deficiency_types = ['protanopia', 'deuteranopia', 'tritanopia']
        
        # Fixed test structure: 7 identical, 3 CVD-specific (1 for each type)
        test_structure = (
            ['identical'] * 7 +  # 7 questions with identical images
            ['protanopia_specific'] +  # 1 protanopia-specific question
            ['deuteranopia_specific'] +  # 1 deuteranopia-specific question  
            ['tritanopia_specific']  # 1 tritanopia-specific question
        )
        
        for i in range(count):
            # Select random image
            image_file = random.choice(test_images)
            image_path = os.path.join(self.test_images_dir, image_file)
            
            # Get the question type from our structure
            question_type = test_structure[i % len(test_structure)]
            
            # Determine deficiency type and difficulty level
            if question_type == 'identical':
                # For identical questions, randomly pick a deficiency type (for context)
                deficiency_type = random.choice(deficiency_types)
                difficulty_level = 'identical'
                
                # Generate identical images
                original_b64, filtered_b64 = self.processor.generate_identical_test_pair(
                    image_path, deficiency_type
                )
                correct_answer = True  # Images are the same
                
            elif question_type.endswith('_specific'):
                # Extract the specific deficiency type
                deficiency_type = question_type.replace('_specific', '')
                difficulty_level = 'cvd_confusion'
                
                # Generate CVD confusion pair (looks same to CVD users, different to normal vision)
                original_b64, filtered_b64 = self.processor.generate_cvd_confusion_pair(
                    image_path, deficiency_type
                )
                correct_answer = False  # Images are different (for normal vision)
            
            question = {
                'question_id': f'q_{i+1}_{deficiency_type}',
                'image_original': original_b64,
                'image_filtered': filtered_b64,
                'filter_type': deficiency_type,
                'correct_answer': correct_answer,
                'difficulty_level': difficulty_level,
                'source_image': image_file,
                'question_type': question_type,
                'timestamp': None
            }
            
            questions.append(question)
        
        logging.info(f"Generated {len(questions)} test questions using {len(test_images)} images")
        logging.info(f"Test structure: 7 identical, 1 protanopia-specific, 1 deuteranopia-specific, 1 tritanopia-specific")
        return questions

class CVDAnalyzer:
    """Analyzes test results to determine color vision deficiency severity"""
    
    def analyze_test_results(self, questions: List[Dict]) -> Dict:
        """
        Analyze test results to determine CVD severity scores with max deficiency of 0.2
        
        Args:
            questions: List of answered test questions
            
        Returns:
            Dictionary with severity scores for each type of CVD (max 0.2)
        """
        print(f"Analyzing {len(questions)} questions with intensity-weighted algorithm (max deficiency: 0.2)")
        
        # Track scores by deficiency type with intensity weighting
        scores = {
            'protanopia': {'total_weight': 0, 'error_weight': 0, 'confusion_errors': 0, 'specific_questions': 0},
            'deuteranopia': {'total_weight': 0, 'error_weight': 0, 'confusion_errors': 0, 'specific_questions': 0},
            'tritanopia': {'total_weight': 0, 'error_weight': 0, 'confusion_errors': 0, 'specific_questions': 0}
        }
        
        # Define intensity weights for different question types
        intensity_weights = {
            'identical': 0.1,        # Very low weight - these should be easy
            'cvd_confusion': 1.0,    # High weight - this is the key indicator for specific CVD type
        }
        
        for i, question in enumerate(questions):
            if question.get('user_response') is not None:
                filter_type = question.get('filter_type')
                correct_answer = question.get('correct_answer')
                user_response = question.get('user_response')
                difficulty_level = question.get('difficulty_level', 'identical')
                question_type = question.get('question_type', 'identical')
                
                if filter_type in scores:
                    # Get intensity weight for this question type
                    weight = intensity_weights.get(difficulty_level, 0.1)
                    scores[filter_type]['total_weight'] += weight
                    
                    # Count specific questions for this CVD type
                    if question_type == f"{filter_type}_specific":
                        scores[filter_type]['specific_questions'] += 1
                    
                    if user_response != correct_answer:
                        # Add weighted error score
                        scores[filter_type]['error_weight'] += weight
                        
                        # Track confusion errors specifically (most important indicator)
                        if difficulty_level == 'cvd_confusion' and question_type == f"{filter_type}_specific":
                            scores[filter_type]['confusion_errors'] += 1
        
        # Calculate weighted severity scores with 0.2 maximum
        severity_scores = {}
        for deficiency_type, score_data in scores.items():
            severity = 0.0
            
            if score_data['specific_questions'] > 0:
                # For the new test structure, focus on the specific question for each CVD type
                if score_data['confusion_errors'] > 0:
                    # If user failed the specific CVD test, assign moderate deficiency
                    severity = 0.15  # 75% of max (0.2)
                else:
                    # If user passed the specific CVD test, very low deficiency
                    severity = 0.0
            
            # Add small penalty for errors in identical questions (should be easy)
            if score_data['total_weight'] > 0:
                identical_error_rate = score_data['error_weight'] / score_data['total_weight']
                severity += identical_error_rate * 0.05  # Max 5% additional from identical questions
            
            # Cap at maximum deficiency of 0.2
            severity = min(0.2, severity)
            severity_scores[deficiency_type] = round(severity, 2)
        
        # Determine overall severity based on highest individual score
        max_severity = max(severity_scores.values()) if severity_scores.values() else 0
        
        # Keep original thresholds for severity classification (before 0.2 cap was applied)
        if max_severity < 0.15:
            overall = 'none'
        elif max_severity < 0.35:
            overall = 'mild'
        elif max_severity < 0.65:
            overall = 'moderate'
        else:
            overall = 'severe'
        
        # Determine if there's no blindness (more conservative threshold)
        no_blindness = 1 if max_severity < 0.1 else 0
        
        result = {
            'protanopia': severity_scores.get('protanopia', 0),
            'deuteranopia': severity_scores.get('deuteranopia', 0),
            'tritanopia': severity_scores.get('tritanopia', 0),
            'no_blindness': no_blindness,
            'overall_severity': overall
        }
        
        logging.info(f"CVD Analysis Results (max 0.2): {result}")
        return result
    
    def generate_correction_filter(self, severity_scores: Dict) -> Dict:
        """
        Generate correction filter parameters based on severity scores
        
        Args:
            severity_scores: Dictionary with severity scores
            
        Returns:
            Filter parameters for correction
        """
        # Extract numeric severity scores (skip overall_severity and no_blindness)
        numeric_scores = [
            severity_scores.get('protanopia', 0),
            severity_scores.get('deuteranopia', 0),
            severity_scores.get('tritanopia', 0)
        ]
        
        max_severity = max(numeric_scores) if numeric_scores else 0
        
        return {
            'protanopia_correction': severity_scores.get('protanopia', 0) * 0.4,  # Reduced from 0.8 to 0.4 for gentler correction
            'deuteranopia_correction': severity_scores.get('deuteranopia', 0) * 0.4,  # Reduced from 0.8 to 0.4 for gentler correction
            'tritanopia_correction': severity_scores.get('tritanopia', 0) * 0.4,  # Reduced from 0.8 to 0.4 for gentler correction
            'brightness_adjustment': 1.0,  # Don't change brightness as requested
            'contrast_adjustment': 1.0,  # Don't change contrast
            'saturation_adjustment': 1.0  # Don't change saturation as requested
        }
    
    def apply_gan_correction_filter(self, image_data: str, severity_scores: Dict) -> Optional[str]:
        """
        Apply GAN-based color correction filter to an image
        
        Args:
            image_data: Base64 encoded image data
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Base64 encoded corrected image or None if GAN not available
        """
        if not self.gan_generator:
            logging.warning("GAN Filter Generator not available, falling back to traditional methods")
            return None
            
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1] if ',' in image_data else image_data)
            image = Image.open(BytesIO(image_bytes))
            image_rgb = np.array(image.convert('RGB'))
            
            # Normalize to [0,1] for GAN model
            image_normalized = image_rgb.astype(np.float32) / 255.0
            
            # Apply GAN filter
            corrected_image = self.gan_generator.apply_filter_to_image(
                image_normalized, severity_scores
            )
            
            # Convert back to [0,255] and uint8
            corrected_image = (corrected_image * 255).astype(np.uint8)
            corrected_image = np.clip(corrected_image, 0, 255)
            
            # Convert to PIL Image and encode as base64
            corrected_pil = Image.fromarray(corrected_image)
            buffer = BytesIO()
            corrected_pil.save(buffer, format='PNG')
            
            corrected_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{corrected_base64}"
            
        except Exception as e:
            logging.error(f"Error applying GAN correction filter: {e}")
            return None
    
    def get_gan_filter_recommendations(self, severity_scores: Dict) -> Optional[Dict]:
        """
        Get GAN-based filter recommendations
        
        Args:
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Filter recommendations or None if GAN not available
        """
        if not self.gan_generator:
            return None
            
        try:
            return self.gan_generator.get_filter_recommendations(severity_scores)
        except Exception as e:
            logging.error(f"Error getting GAN filter recommendations: {e}")
            return None
    
    def apply_hybrid_correction_filter(self, image_data: str, severity_scores: Dict, use_gan: bool = True) -> str:
        """
        Apply correction filter using GAN if available, fallback to traditional methods
        
        Args:
            image_data: Base64 encoded image data
            severity_scores: Dictionary with CVD severity scores
            use_gan: Whether to try GAN first (default: True)
            
        Returns:
            Base64 encoded corrected image
        """
        # Try GAN filter first if requested and available
        if use_gan and self.gan_generator:
            gan_result = self.apply_gan_correction_filter(image_data, severity_scores)
            if gan_result:
                logging.info("Applied GAN-based correction filter")
                return gan_result
            else:
                logging.warning("GAN filter failed, falling back to traditional methods")
        
        # Fallback to traditional filter methods
        logging.info("Applying traditional correction filter")
        return self.apply_traditional_correction_filter(image_data, severity_scores)
    
    def apply_traditional_correction_filter(self, image_data: str, severity_scores: Dict) -> str:
        """
        Apply traditional correction filter (existing method renamed for clarity)
        
        Args:
            image_data: Base64 encoded image data
            severity_scores: Dictionary with CVD severity scores
            
        Returns:
            Base64 encoded corrected image
        """
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1] if ',' in image_data else image_data)
            image = Image.open(BytesIO(image_bytes))
            image_rgb = np.array(image.convert('RGB')).astype(np.float32) / 255.0
            
            # Get filter parameters
            filter_params = self.generate_correction_filter(severity_scores)
            
            # Apply corrections based on severity scores
            corrected = image_rgb.copy()
            
            # Enhanced protanopia correction (red-green issues)
            if severity_scores.get('protanopia', 0) > 0:
                intensity = filter_params['protanopia_correction'] * 1.0  # Reduced from 2.0 to 1.0 (50% reduction)
                # Enhance red channel separation
                corrected[:, :, 0] = np.clip(corrected[:, :, 0] * (1.0 + intensity), 0, 1)
                # Apply orange-red shift to improve red perception
                red_mask = corrected[:, :, 0] > corrected[:, :, 1]
                corrected[red_mask, 1] *= (1.0 + intensity * 0.15)  # Reduced from 0.3 to 0.15 (50% reduction)
            
            # Enhanced deuteranopia correction (green issues)
            if severity_scores.get('deuteranopia', 0) > 0:
                intensity = filter_params['deuteranopia_correction'] * 0.75  # Reduced from 1.5 to 0.75 (50% reduction)
                # Boost green channel differentiation
                corrected[:, :, 1] = np.clip(corrected[:, :, 1] * (1.0 + intensity), 0, 1)
                # Add subtle blue shift for green perception
                green_areas = corrected[:, :, 1] > np.maximum(corrected[:, :, 0], corrected[:, :, 2])
                corrected[green_areas, 2] *= (1.0 + intensity * 0.1)  # Reduced from 0.2 to 0.1 (50% reduction)
            
            # Enhanced tritanopia correction (blue-yellow issues)
            if severity_scores.get('tritanopia', 0) > 0:
                intensity = filter_params['tritanopia_correction'] * 1.0  # Reduced from 2.0 to 1.0 (50% reduction)
                # Enhance blue-yellow discrimination
                corrected[:, :, 2] = np.clip(corrected[:, :, 2] * (1.0 + intensity), 0, 1)
                # Apply yellow enhancement
                yellow_areas = (corrected[:, :, 0] > 0.5) & (corrected[:, :, 1] > 0.5) & (corrected[:, :, 2] < 0.3)
                corrected[yellow_areas, 0] *= (1.0 + intensity * 0.2)  # Reduced from 0.4 to 0.2 (50% reduction)
                corrected[yellow_areas, 1] *= (1.0 + intensity * 0.2)  # Reduced from 0.4 to 0.2 (50% reduction)
            
            # Apply global adjustments
            corrected = self._apply_global_adjustments(
                corrected, 
                filter_params['brightness_adjustment'],
                filter_params['contrast_adjustment'], 
                filter_params['saturation_adjustment']
            )
            
            # Ensure values are in valid range and convert back to uint8
            corrected = np.clip(corrected * 255, 0, 255).astype(np.uint8)
            
            # Convert to PIL Image and encode as base64
            corrected_image = Image.fromarray(corrected)
            buffer = BytesIO()
            corrected_image.save(buffer, format='PNG')
            
            corrected_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{corrected_base64}"
            
        except Exception as e:
            logging.error(f"Error applying traditional correction filter: {e}")
            # Return original image in case of error
            return image_data
    
    def _apply_global_adjustments(self, 
                                image: np.ndarray, 
                                brightness: float, 
                                contrast: float, 
                                saturation: float) -> np.ndarray:
        """
        Apply global brightness, contrast, and saturation adjustments
        
        Args:
            image: Input image as numpy array [0-1] float32
            brightness: Brightness adjustment factor (1.0 = no change)
            contrast: Contrast adjustment factor (1.0 = no change)
            saturation: Saturation adjustment factor (1.0 = no change)
        
        Returns:
            Adjusted image as numpy array [0-1] float32
        """
        try:
            adjusted = image.copy()
            
            # Apply brightness adjustment
            adjusted = adjusted * brightness
            
            # Apply contrast adjustment (around 0.5 midpoint)
            adjusted = (adjusted - 0.5) * contrast + 0.5
            
            # Apply saturation adjustment
            if saturation != 1.0:
                # Convert to grayscale for saturation adjustment
                gray = np.dot(adjusted, [0.299, 0.587, 0.114])
                gray = np.stack([gray, gray, gray], axis=-1)
                # Blend between grayscale and color
                adjusted = gray + saturation * (adjusted - gray)
            
            # Ensure values stay in valid range
            adjusted = np.clip(adjusted, 0.0, 1.0)
            
            return adjusted
            
        except Exception as e:
            logging.error(f"Error applying global adjustments: {e}")
            return image