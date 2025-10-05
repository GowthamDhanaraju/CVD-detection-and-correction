#!/usr/bin/env python3
"""
Script to fix filter intensities in dalton_lens_utils.py
"""

import re

def main():
    # Read the file
    with open('dalton_lens_utils.py', 'r') as f:
        content = f.read()

    # Replace the specific intensity values in CVDAnalyzer class only
    lines = content.split('\n')
    in_traditional_method = False
    updated_lines = []

    for i, line in enumerate(lines):
        if 'def apply_traditional_correction_filter(self, image_data: str, severity_scores: Dict)' in line:
            in_traditional_method = True
        elif in_traditional_method and line.strip().startswith('def ') and not 'apply_traditional_correction_filter' in line:
            in_traditional_method = False
        
        if in_traditional_method:
            if 'protanopia_correction\'] * 1.0  # Reduced from 2.0 to 1.0' in line:
                line = line.replace('* 1.0  # Reduced from 2.0 to 1.0 (50% reduction)', '* 2.0  # Increased for better visibility')
            elif 'deuteranopia_correction\'] * 0.75  # Reduced from 1.5 to 0.75' in line:
                line = line.replace('* 0.75  # Reduced from 1.5 to 0.75 (50% reduction)', '* 1.5  # Increased for better visibility')
            elif 'tritanopia_correction\'] * 1.0  # Reduced from 2.0 to 1.0' in line:
                line = line.replace('* 1.0  # Reduced from 2.0 to 1.0 (50% reduction)', '* 2.0  # Increased for better visibility')
            elif 'intensity * 0.15)  # Reduced from 0.3 to 0.15' in line:
                line = line.replace('* 0.15)  # Reduced from 0.3 to 0.15 (50% reduction)', '* 0.3)  # Increased for better visibility')
            elif 'intensity * 0.1)  # Reduced from 0.2 to 0.1' in line:
                line = line.replace('* 0.1)  # Reduced from 0.2 to 0.1 (50% reduction)', '* 0.2)  # Increased for better visibility')
            elif 'intensity * 0.2)  # Reduced from 0.4 to 0.2' in line:
                line = line.replace('* 0.2)  # Reduced from 0.4 to 0.2 (50% reduction)', '* 0.4)  # Increased for better visibility')
        
        updated_lines.append(line)

    # Write back the file
    with open('dalton_lens_utils.py', 'w') as f:
        f.write('\n'.join(updated_lines))

    print('Filter intensities updated successfully!')

if __name__ == '__main__':
    main()