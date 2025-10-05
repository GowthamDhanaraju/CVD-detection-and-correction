"""
Image Download Service for CVD Testing
Downloads random images from various sources for color vision deficiency testing
"""

import requests
import os
import random
from PIL import Image
import io
import logging
from typing import List, Optional
import time

class ImageDownloadService:
    def __init__(self):
        # Multiple image sources for diversity
        self.image_sources = [
            # Picsum provides random high-quality images
            "https://picsum.photos/400/300?random=",
            # Lorem Picsum with different dimensions
            "https://picsum.photos/500/400?random=",
            # Unsplash Source (backup)
            "https://source.unsplash.com/400x300/?nature,landscape,city,food,animals,flowers&sig=",
        ]
        
        # Specific categories for better test diversity
        self.unsplash_categories = [
            "nature", "landscape", "city", "food", "animals", "flowers", 
            "architecture", "technology", "art", "abstract", "colorful",
            "fruit", "vegetables", "sunset", "forest", "ocean"
        ]
        
        self.download_timeout = 15
        self.max_retries = 3
        
    def download_test_images(self, count: int = 20, output_dir: str = "data/test_images") -> List[str]:
        """
        Download random images for testing
        
        Args:
            count: Number of images to download
            output_dir: Directory to save images
            
        Returns:
            List of successfully downloaded image paths
        """
        os.makedirs(output_dir, exist_ok=True)
        downloaded_paths = []
        
        logging.info(f"Starting download of {count} test images...")
        
        for i in range(count):
            success = False
            for attempt in range(self.max_retries):
                try:
                    # Choose random source and category
                    source_type = random.choice(["picsum", "picsum_large", "unsplash"])
                    
                    if source_type == "picsum":
                        url = f"https://picsum.photos/400/300?random={i}{attempt}"
                    elif source_type == "picsum_large":
                        url = f"https://picsum.photos/500/400?random={i}{attempt}"
                    else:  # unsplash
                        category = random.choice(self.unsplash_categories)
                        url = f"https://source.unsplash.com/400x300/?{category}&sig={i}{attempt}"
                    
                    # Download image
                    response = requests.get(url, timeout=self.download_timeout)
                    if response.status_code == 200:
                        # Convert to PIL Image to ensure it's valid
                        image = Image.open(io.BytesIO(response.content))
                        
                        # Convert to RGB if necessary
                        if image.mode != 'RGB':
                            image = image.convert('RGB')
                        
                        # Save image
                        image_path = os.path.join(output_dir, f"downloaded_test_image_{i+1}.jpg")
                        image.save(image_path, "JPEG", quality=90)
                        
                        downloaded_paths.append(image_path)
                        logging.info(f"Downloaded image {i+1}/{count}: {os.path.basename(image_path)}")
                        success = True
                        break
                        
                except Exception as e:
                    logging.warning(f"Attempt {attempt+1} failed for image {i+1}: {e}")
                    time.sleep(1)  # Wait before retry
            
            if not success:
                logging.error(f"Failed to download image {i+1} after {self.max_retries} attempts")
            
            # Small delay to be respectful to servers
            time.sleep(0.5)
        
        logging.info(f"Successfully downloaded {len(downloaded_paths)} out of {count} images")
        return downloaded_paths
    
    def download_single_image(self, url: str, output_path: str) -> bool:
        """
        Download a single image from URL
        
        Args:
            url: Image URL
            output_path: Path to save the image
            
        Returns:
            True if successful, False otherwise
        """
        try:
            response = requests.get(url, timeout=self.download_timeout)
            if response.status_code == 200:
                image = Image.open(io.BytesIO(response.content))
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                image.save(output_path, "JPEG", quality=90)
                return True
        except Exception as e:
            logging.error(f"Failed to download image from {url}: {e}")
        
        return False
    
    def refresh_test_images(self, output_dir: str = "data/test_images", keep_existing: bool = False):
        """
        Refresh the test images directory with new downloads
        
        Args:
            output_dir: Directory containing test images
            keep_existing: Whether to keep existing images or replace all
        """
        if not keep_existing:
            # Remove existing downloaded images
            if os.path.exists(output_dir):
                for file in os.listdir(output_dir):
                    if file.startswith("downloaded_test_image_"):
                        os.remove(os.path.join(output_dir, file))
        
        # Download new images
        return self.download_test_images(20, output_dir)
    
    def get_image_variety_stats(self, output_dir: str = "data/test_images") -> dict:
        """
        Get statistics about the variety of test images
        
        Args:
            output_dir: Directory containing test images
            
        Returns:
            Dictionary with image statistics
        """
        if not os.path.exists(output_dir):
            return {"total_images": 0}
        
        images = [f for f in os.listdir(output_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        
        # Analyze image properties
        colors_stats = {"bright": 0, "dark": 0, "colorful": 0, "monochrome": 0}
        
        for img_file in images:
            try:
                img_path = os.path.join(output_dir, img_file)
                image = Image.open(img_path)
                
                # Convert to RGB if needed
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Get basic color statistics
                import numpy as np
                img_array = np.array(image)
                
                # Calculate brightness
                brightness = np.mean(img_array)
                if brightness > 128:
                    colors_stats["bright"] += 1
                else:
                    colors_stats["dark"] += 1
                
                # Calculate color variance (rough measure of colorfulness)
                color_variance = np.var(img_array, axis=(0,1))
                avg_variance = np.mean(color_variance)
                
                if avg_variance > 1000:
                    colors_stats["colorful"] += 1
                else:
                    colors_stats["monochrome"] += 1
                    
            except Exception as e:
                logging.warning(f"Error analyzing image {img_file}: {e}")
        
        return {
            "total_images": len(images),
            "downloaded_images": len([f for f in images if f.startswith("downloaded_test_image_")]),
            "generated_images": len([f for f in images if f.startswith("test_pattern_")]),
            "color_distribution": colors_stats
        }

# Global instance
_image_download_service = None

def get_image_download_service() -> ImageDownloadService:
    """Get global ImageDownloadService instance"""
    global _image_download_service
    if _image_download_service is None:
        _image_download_service = ImageDownloadService()
    return _image_download_service