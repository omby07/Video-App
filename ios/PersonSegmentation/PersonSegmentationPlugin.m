//
//  PersonSegmentationPlugin.m
//  Video-Beautify
//
//  Objective-C registration for the native frame processor plugin
//

#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

@interface PersonSegmentationPlugin : FrameProcessorPlugin
@end

@implementation PersonSegmentationPlugin

+ (void)load {
    [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"segmentPerson" 
                                          withInitializer:^FrameProcessorPlugin* (VisionCameraProxyHolder* proxy, NSDictionary* options) {
        return [[PersonSegmentationPlugin alloc] initWithProxy:proxy withOptions:options];
    }];
}

@end
