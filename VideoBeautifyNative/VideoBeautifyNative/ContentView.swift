//
//  ContentView.swift
//  VideoBeautifyNative
//
//  Main UI with camera preview and controls
//

import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var cameraManager = CameraManager()
    
    // Effect controls
    @State private var blurEnabled = false
    @State private var blurIntensity: Double = 50
    @State private var touchUpEnabled = false
    @State private var smoothingIntensity: Double = 30
    @State private var brightnessAdjust: Double = 0
    
    // Recording state
    @State private var isRecording = false
    @State private var recordingDuration: TimeInterval = 0
    @State private var showingSavedAlert = false
    
    // Permission state
    @State private var permissionsGranted = false
    @State private var showingPermissionAlert = false
    
    var body: some View {
        ZStack {
            // Camera Preview
            CameraPreviewView(cameraManager: cameraManager)
                .ignoresSafeArea()
            
            // Recording indicator
            if isRecording {
                VStack {
                    HStack {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 12, height: 12)
                        Text(formatDuration(recordingDuration))
                            .font(.system(size: 16, weight: .semibold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(20)
                    .padding(.top, 60)
                    
                    Spacer()
                }
            }
            
            // Controls overlay
            VStack {
                Spacer()
                
                // Effect toggles and sliders
                VStack(spacing: 16) {
                    // Blur control
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle(isOn: $blurEnabled) {
                            HStack {
                                Image(systemName: "camera.filters")
                                Text("Background Blur")
                            }
                        }
                        .onChange(of: blurEnabled) { newValue in
                            cameraManager.blurEnabled = newValue
                        }
                        
                        if blurEnabled {
                            HStack {
                                Text("Intensity")
                                    .font(.caption)
                                Slider(value: $blurIntensity, in: 10...100)
                                    .onChange(of: blurIntensity) { newValue in
                                        cameraManager.blurIntensity = newValue
                                    }
                                Text("\(Int(blurIntensity))%")
                                    .font(.caption)
                                    .frame(width: 40)
                            }
                        }
                    }
                    
                    Divider()
                    
                    // Touch-up control
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle(isOn: $touchUpEnabled) {
                            HStack {
                                Image(systemName: "sparkles")
                                Text("Face Touch-up")
                            }
                        }
                        .onChange(of: touchUpEnabled) { newValue in
                            cameraManager.touchUpEnabled = newValue
                        }
                        
                        if touchUpEnabled {
                            HStack {
                                Text("Smoothing")
                                    .font(.caption)
                                Slider(value: $smoothingIntensity, in: 0...100)
                                    .onChange(of: smoothingIntensity) { newValue in
                                        cameraManager.smoothingIntensity = newValue
                                    }
                                Text("\(Int(smoothingIntensity))%")
                                    .font(.caption)
                                    .frame(width: 40)
                            }
                            
                            HStack {
                                Text("Brightness")
                                    .font(.caption)
                                Slider(value: $brightnessAdjust, in: -50...50)
                                    .onChange(of: brightnessAdjust) { newValue in
                                        cameraManager.brightnessAdjust = newValue
                                    }
                                Text(brightnessAdjust >= 0 ? "+\(Int(brightnessAdjust))" : "\(Int(brightnessAdjust))")
                                    .font(.caption)
                                    .frame(width: 40)
                            }
                        }
                    }
                }
                .padding()
                .background(Color.black.opacity(0.7))
                .cornerRadius(16)
                .padding(.horizontal)
                
                // Record button
                Button(action: toggleRecording) {
                    ZStack {
                        Circle()
                            .stroke(Color.white, lineWidth: 4)
                            .frame(width: 80, height: 80)
                        
                        if isRecording {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.red)
                                .frame(width: 32, height: 32)
                        } else {
                            Circle()
                                .fill(Color.red)
                                .frame(width: 64, height: 64)
                        }
                    }
                }
                .padding(.vertical, 30)
            }
        }
        .onAppear {
            print("[ContentView] onAppear")
            cameraManager.startSession()
        }
        .onDisappear {
            print("[ContentView] onDisappear")
            cameraManager.stopSession()
        }
        .alert("Video Saved", isPresented: $showingSavedAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Your video has been saved to Photos.")
        }
        .alert("Permissions Required", isPresented: $showingPermissionAlert) {
            Button("Open Settings") {
                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(settingsURL)
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Camera and microphone access are required to record videos. Please enable them in Settings.")
        }
        .onReceive(cameraManager.$lastSavedURL) { url in
            if url != nil {
                showingSavedAlert = true
            }
        }
    }
    
    private func toggleRecording() {
        if isRecording {
            cameraManager.stopRecording()
            isRecording = false
        } else {
            cameraManager.startRecording()
            isRecording = true
            startRecordingTimer()
        }
    }
    
    private func startRecordingTimer() {
        recordingDuration = 0
        Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
            if isRecording {
                recordingDuration += 0.1
            } else {
                timer.invalidate()
            }
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        let tenths = Int((duration * 10).truncatingRemainder(dividingBy: 10))
        return String(format: "%02d:%02d.%d", minutes, seconds, tenths)
    }
}

#Preview {
    ContentView()
}
