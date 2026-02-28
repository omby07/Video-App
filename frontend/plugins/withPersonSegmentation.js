/**
 * Expo Config Plugin for Person Segmentation
 * 
 * This plugin injects the native iOS code for person segmentation
 * using Apple's Vision framework (VNGeneratePersonSegmentationRequest).
 * 
 * The plugin:
 * 1. Creates the Swift frame processor plugin files
 * 2. Adds them to the Xcode project
 * 3. Links required frameworks (Vision, CoreImage)
 */

const { withXcodeProject, withDangerousMod, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Swift plugin code
const SWIFT_PLUGIN_CODE = `//
//  PersonSegmentationPlugin.swift
//  VideoBeautify
//
//  Native Frame Processor Plugin using Apple's Vision Framework
//  for real-time person segmentation (background blur/replacement)
//

import Foundation
import Vision
import VisionCamera
import CoreImage

@objc(PersonSegmentationFrameProcessorPlugin)
public class PersonSegmentationFrameProcessorPlugin: FrameProcessorPlugin {
    
    // Segmentation request - reused for performance
    private lazy var segmentationRequest: VNGeneratePersonSegmentationRequest = {
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .balanced
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        return request
    }()
    
    // CIContext for image processing (GPU accelerated)
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])
    
    public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
        super.init(proxy: proxy, options: options)
    }
    
    public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
        // Get effect parameters
        let effectType = arguments?["effectType"] as? String ?? "none"
        let blurIntensity = arguments?["blurIntensity"] as? Double ?? 50.0
        let backgroundColor = arguments?["backgroundColor"] as? String ?? "#222222"
        
        if effectType == "none" { return nil }
        
        // Get pixel buffer from frame - CMSampleBufferGetImageBuffer returns CVImageBuffer?
        let pixelBufferOptional: CVPixelBuffer? = CMSampleBufferGetImageBuffer(frame.buffer)
        guard let pixelBuffer = pixelBufferOptional else {
            return ["success": false, "error": "No pixel buffer"]
        }
        
        // Create CIImage from pixel buffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        
        // Run person segmentation
        let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
        
        do {
            try handler.perform([segmentationRequest])
            
            guard let result = segmentationRequest.results?.first else {
                return ["success": false, "error": "No segmentation result"]
            }
            
            let maskPixelBuffer = result.pixelBuffer
            
            // Create mask CIImage and scale to match frame
            let maskImage = CIImage(cvPixelBuffer: maskPixelBuffer)
            let scaleX = ciImage.extent.width / maskImage.extent.width
            let scaleY = ciImage.extent.height / maskImage.extent.height
            let scaledMask = maskImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
            
            var outputImage: CIImage
            
            if effectType == "blur" {
                // Apply blur to background only
                let blurRadius = (blurIntensity / 100.0) * 30.0
                
                let blurredImage = ciImage.applyingGaussianBlur(sigma: blurRadius)
                
                // Composite: sharp person over blurred background using mask
                outputImage = blurredImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage,
                    kCIInputMaskImageKey: scaledMask
                ])
                
            } else if effectType == "color" {
                // Replace background with solid color
                let color = colorFromHex(backgroundColor)
                let colorImage = CIImage(color: color).cropped(to: ciImage.extent)
                
                // Composite: person over solid color using mask
                outputImage = colorImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage,
                    kCIInputMaskImageKey: scaledMask
                ])
                
            } else {
                return ["success": false, "error": "Unknown effect"]
            }
            
            // Render back to pixel buffer
            ciContext.render(outputImage, to: pixelBuffer)
            
            return ["success": true, "effect": effectType]
            
        } catch {
            return ["success": false, "error": error.localizedDescription]
        }
    }
    
    private func colorFromHex(_ hex: String) -> CIColor {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        
        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0
        
        return CIColor(red: r, green: g, blue: b)
    }
}
`;

// Objective-C registration code
const OBJC_REGISTRATION_CODE = `//
//  PersonSegmentationPluginRegistration.m
//  VideoBeautify
//

#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#if __has_include("VideoBeautify-Swift.h")
#import "VideoBeautify-Swift.h"
#elif __has_include(<VideoBeautify/VideoBeautify-Swift.h>)
#import <VideoBeautify/VideoBeautify-Swift.h>
#endif

@interface PersonSegmentationPluginRegistration : NSObject
@end

@implementation PersonSegmentationPluginRegistration

+ (void)load {
    [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"segmentPerson"
                                          withInitializer:^FrameProcessorPlugin* (VisionCameraProxyHolder* proxy, NSDictionary* options) {
        return [[PersonSegmentationFrameProcessorPlugin alloc] initWithProxy:proxy withOptions:options];
    }];
}

@end
`;

function withPersonSegmentation(config) {
  // Step 1: Create native files
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      
      // Create PersonSegmentation folder
      const pluginDir = path.join(platformProjectRoot, 'PersonSegmentation');
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }
      
      // Write Swift plugin
      const swiftPath = path.join(pluginDir, 'PersonSegmentationPlugin.swift');
      fs.writeFileSync(swiftPath, SWIFT_PLUGIN_CODE);
      console.log('[PersonSegmentation] Created Swift plugin');
      
      // Write Objective-C registration
      const objcPath = path.join(pluginDir, 'PersonSegmentationPluginRegistration.m');
      fs.writeFileSync(objcPath, OBJC_REGISTRATION_CODE);
      console.log('[PersonSegmentation] Created Obj-C registration');
      
      return config;
    },
  ]);

  // Step 2: Add files to Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName || 'VideoBeautify';
    
    // Get the main group
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    
    // Add PersonSegmentation group if it doesn't exist
    let personSegGroup = xcodeProject.pbxGroupByName('PersonSegmentation');
    if (!personSegGroup) {
      personSegGroup = xcodeProject.addPbxGroup(
        ['PersonSegmentationPlugin.swift', 'PersonSegmentationPluginRegistration.m'],
        'PersonSegmentation',
        'PersonSegmentation'
      );
    }
    
    // Add source files to build phases
    const swiftFile = 'PersonSegmentation/PersonSegmentationPlugin.swift';
    const objcFile = 'PersonSegmentation/PersonSegmentationPluginRegistration.m';
    
    try {
      xcodeProject.addSourceFile(swiftFile, null, personSegGroup.uuid);
      xcodeProject.addSourceFile(objcFile, null, personSegGroup.uuid);
      console.log('[PersonSegmentation] Added files to Xcode project');
    } catch (e) {
      // Files may already be added
      console.log('[PersonSegmentation] Files already in project or error:', e.message);
    }
    
    // Add Vision framework
    try {
      xcodeProject.addFramework('Vision.framework');
      xcodeProject.addFramework('CoreImage.framework');
      console.log('[PersonSegmentation] Added frameworks');
    } catch (e) {
      console.log('[PersonSegmentation] Frameworks already added');
    }
    
    return config;
  });

  return config;
}

module.exports = withPersonSegmentation;
