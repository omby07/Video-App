#!/usr/bin/env python3
"""
Video Recording App Backend API Test Suite
Tests all backend endpoints according to the specified test plan
"""

import requests
import json
from datetime import datetime

# Get the backend URL from environment
BACKEND_URL = "https://video-beautify-1.preview.emergentagent.com/api"

def print_test_result(test_name, success, response=None, error=None):
    """Print formatted test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"\n{status} {test_name}")
    if response:
        print(f"Response: {response}")
    if error:
        print(f"Error: {error}")
    print("-" * 60)

def test_get_settings():
    """Test 1: GET /api/settings - Should return default user settings"""
    try:
        response = requests.get(f"{BACKEND_URL}/settings")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify required fields exist
            required_fields = ['id', 'user_id', 'is_premium', 'default_quality', 'max_duration']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print_test_result("GET /settings", False, response.text, f"Missing fields: {missing_fields}")
                return False, None
            
            # Verify default values
            expected_defaults = {
                'is_premium': False,
                'default_quality': 'hd',
                'max_duration': 1800
            }
            
            incorrect_defaults = []
            for key, expected_value in expected_defaults.items():
                if data[key] != expected_value:
                    incorrect_defaults.append(f"{key}: expected {expected_value}, got {data[key]}")
            
            if incorrect_defaults:
                print_test_result("GET /settings", False, data, f"Incorrect defaults: {incorrect_defaults}")
                return False, None
            
            print_test_result("GET /settings", True, data)
            return True, data
        else:
            print_test_result("GET /settings", False, response.text, f"Status: {response.status_code}")
            return False, None
            
    except Exception as e:
        print_test_result("GET /settings", False, error=str(e))
        return False, None

def test_put_settings():
    """Test 2: PUT /api/settings - Test updating settings"""
    try:
        # Test updating to full-hd
        response = requests.put(f"{BACKEND_URL}/settings", 
                              json={"default_quality": "full-hd"})
        
        if response.status_code == 200:
            data = response.json()
            if data['default_quality'] != 'full-hd':
                print_test_result("PUT /settings (full-hd)", False, data, "Quality not updated to full-hd")
                return False
            print_test_result("PUT /settings (full-hd)", True, data)
        else:
            print_test_result("PUT /settings (full-hd)", False, response.text, f"Status: {response.status_code}")
            return False
        
        # Test updating to lo-res
        response = requests.put(f"{BACKEND_URL}/settings", 
                              json={"default_quality": "lo-res"})
        
        if response.status_code == 200:
            data = response.json()
            if data['default_quality'] != 'lo-res':
                print_test_result("PUT /settings (lo-res)", False, data, "Quality not updated to lo-res")
                return False
            print_test_result("PUT /settings (lo-res)", True, data)
            return True
        else:
            print_test_result("PUT /settings (lo-res)", False, response.text, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("PUT /settings", False, error=str(e))
        return False

def test_premium_upgrade():
    """Test 3: POST /api/settings/premium - Should upgrade user to premium"""
    try:
        response = requests.post(f"{BACKEND_URL}/settings/premium")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify the response message
            if 'message' not in data or 'max_duration' not in data:
                print_test_result("POST /settings/premium", False, data, "Missing message or max_duration in response")
                return False
            
            if data['max_duration'] != 7200:
                print_test_result("POST /settings/premium", False, data, f"Expected max_duration 7200, got {data['max_duration']}")
                return False
            
            # Verify by getting settings again
            settings_response = requests.get(f"{BACKEND_URL}/settings")
            if settings_response.status_code == 200:
                settings = settings_response.json()
                if not settings['is_premium'] or settings['max_duration'] != 7200:
                    print_test_result("POST /settings/premium", False, settings, "Premium upgrade not reflected in settings")
                    return False
            
            print_test_result("POST /settings/premium", True, data)
            return True
        else:
            print_test_result("POST /settings/premium", False, response.text, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("POST /settings/premium", False, error=str(e))
        return False

def test_create_background():
    """Test 4: POST /api/backgrounds - Create a custom background"""
    try:
        background_data = {
            "name": "Test Background",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "is_predefined": False
        }
        
        response = requests.post(f"{BACKEND_URL}/backgrounds", json=background_data)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify required fields exist
            required_fields = ['id', 'name', 'image_data', 'is_predefined', 'created_at']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print_test_result("POST /backgrounds", False, data, f"Missing fields: {missing_fields}")
                return False, None
            
            # Verify field values
            if data['name'] != background_data['name']:
                print_test_result("POST /backgrounds", False, data, "Name mismatch")
                return False, None
            
            if data['is_predefined'] != background_data['is_predefined']:
                print_test_result("POST /backgrounds", False, data, "is_predefined mismatch")
                return False, None
            
            print_test_result("POST /backgrounds", True, {"id": data['id'], "name": data['name']})
            return True, data['id']
        else:
            print_test_result("POST /backgrounds", False, response.text, f"Status: {response.status_code}")
            return False, None
            
    except Exception as e:
        print_test_result("POST /backgrounds", False, error=str(e))
        return False, None

def test_get_backgrounds():
    """Test 5: GET /api/backgrounds - Should return list of backgrounds"""
    try:
        response = requests.get(f"{BACKEND_URL}/backgrounds")
        
        if response.status_code == 200:
            data = response.json()
            
            if not isinstance(data, list):
                print_test_result("GET /backgrounds", False, data, "Response is not a list")
                return False
            
            # Check if our test background is in the list
            test_background_found = False
            for bg in data:
                if bg.get('name') == 'Test Background':
                    test_background_found = True
                    break
            
            if not test_background_found:
                print_test_result("GET /backgrounds", False, data, "Test background not found in list")
                return False
            
            print_test_result("GET /backgrounds", True, f"Found {len(data)} backgrounds including test background")
            return True
        else:
            print_test_result("GET /backgrounds", False, response.text, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("GET /backgrounds", False, error=str(e))
        return False

def test_create_video():
    """Test 6: POST /api/videos - Create a test video"""
    try:
        video_data = {
            "title": "Test Video",
            "duration": 120.5,
            "quality": "hd",
            "background_type": "blur",
            "background_value": "enabled",
            "filters_applied": ["basic", "brightness:0.1"],
            "video_data": "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAr==",
            "thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
        }
        
        response = requests.post(f"{BACKEND_URL}/videos", json=video_data)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify required fields exist (should not include video_data in response)
            required_fields = ['id', 'title', 'duration', 'quality', 'created_at']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print_test_result("POST /videos", False, data, f"Missing fields: {missing_fields}")
                return False, None
            
            # Verify video_data is not in response (performance optimization)
            if 'video_data' in data:
                print_test_result("POST /videos", False, data, "video_data should not be in response")
                return False, None
            
            # Verify field values
            if data['title'] != video_data['title'] or data['duration'] != video_data['duration']:
                print_test_result("POST /videos", False, data, "Title or duration mismatch")
                return False, None
            
            print_test_result("POST /videos", True, {"id": data['id'], "title": data['title'], "duration": data['duration']})
            return True, data['id']
        else:
            print_test_result("POST /videos", False, response.text, f"Status: {response.status_code}")
            return False, None
            
    except Exception as e:
        print_test_result("POST /videos", False, error=str(e))
        return False, None

def test_get_videos():
    """Test 7: GET /api/videos - Should return list of videos without video_data"""
    try:
        response = requests.get(f"{BACKEND_URL}/videos")
        
        if response.status_code == 200:
            data = response.json()
            
            if not isinstance(data, list):
                print_test_result("GET /videos", False, data, "Response is not a list")
                return False
            
            # Check if our test video is in the list
            test_video_found = False
            for video in data:
                if video.get('title') == 'Test Video':
                    test_video_found = True
                    
                    # Verify video_data is not included
                    if 'video_data' in video:
                        print_test_result("GET /videos", False, video, "video_data should not be included for performance")
                        return False
                    
                    # Verify required fields are present
                    required_fields = ['id', 'title', 'duration', 'quality', 'thumbnail']
                    missing_fields = [field for field in required_fields if field not in video]
                    if missing_fields:
                        print_test_result("GET /videos", False, video, f"Missing fields: {missing_fields}")
                        return False
                    
                    break
            
            if not test_video_found:
                print_test_result("GET /videos", False, data, "Test video not found in list")
                return False
            
            print_test_result("GET /videos", True, f"Found {len(data)} videos including test video (no video_data)")
            return True
        else:
            print_test_result("GET /videos", False, response.text, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("GET /videos", False, error=str(e))
        return False

def test_get_specific_video(video_id):
    """Test 8: GET /api/videos/{video_id} - Should return full video object"""
    try:
        response = requests.get(f"{BACKEND_URL}/videos/{video_id}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify all fields are present including video_data
            required_fields = ['id', 'title', 'duration', 'quality', 'video_data', 'thumbnail', 'created_at']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print_test_result(f"GET /videos/{video_id}", False, data, f"Missing fields: {missing_fields}")
                return False
            
            # Verify it's the correct video
            if data['id'] != video_id or data['title'] != 'Test Video':
                print_test_result(f"GET /videos/{video_id}", False, data, "Incorrect video returned")
                return False
            
            print_test_result(f"GET /videos/{video_id}", True, {"id": data['id'], "title": data['title'], "has_video_data": bool(data.get('video_data'))})
            return True
        else:
            print_test_result(f"GET /videos/{video_id}", False, response.text, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result(f"GET /videos/{video_id}", False, error=str(e))
        return False

def test_delete_video(video_id):
    """Test 9: DELETE /api/videos/{video_id} - Delete the test video"""
    try:
        response = requests.delete(f"{BACKEND_URL}/videos/{video_id}")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'message' not in data:
                print_test_result(f"DELETE /videos/{video_id}", False, data, "No success message in response")
                return False
            
            # Verify video is actually deleted
            verify_response = requests.get(f"{BACKEND_URL}/videos/{video_id}")
            if verify_response.status_code != 404:
                print_test_result(f"DELETE /videos/{video_id}", False, verify_response.text, "Video still exists after deletion")
                return False
            
            print_test_result(f"DELETE /videos/{video_id}", True, data)
            return True
        else:
            print_test_result(f"DELETE /videos/{video_id}", False, response.text, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result(f"DELETE /videos/{video_id}", False, error=str(e))
        return False

def test_delete_background(background_id):
    """Test 10: DELETE /api/backgrounds/{background_id} - Delete the test background"""
    try:
        response = requests.delete(f"{BACKEND_URL}/backgrounds/{background_id}")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'message' not in data:
                print_test_result(f"DELETE /backgrounds/{background_id}", False, data, "No success message in response")
                return False
            
            print_test_result(f"DELETE /backgrounds/{background_id}", True, data)
            return True
        else:
            print_test_result(f"DELETE /backgrounds/{background_id}", False, response.text, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result(f"DELETE /backgrounds/{background_id}", False, error=str(e))
        return False

def run_all_tests():
    """Run all backend API tests in the specified order"""
    print("=" * 80)
    print("VIDEO RECORDING APP - BACKEND API TEST SUITE")
    print("=" * 80)
    print(f"Testing backend at: {BACKEND_URL}")
    print(f"Test started at: {datetime.now()}")
    
    failed_tests = []
    passed_tests = []
    
    # Test 1: GET /api/settings
    success, _ = test_get_settings()
    if success:
        passed_tests.append("GET /settings")
    else:
        failed_tests.append("GET /settings")
    
    # Test 2: PUT /api/settings
    success = test_put_settings()
    if success:
        passed_tests.append("PUT /settings")
    else:
        failed_tests.append("PUT /settings")
    
    # Test 3: POST /api/settings/premium
    success = test_premium_upgrade()
    if success:
        passed_tests.append("POST /settings/premium")
    else:
        failed_tests.append("POST /settings/premium")
    
    # Test 4: POST /api/backgrounds
    success, background_id = test_create_background()
    if success:
        passed_tests.append("POST /backgrounds")
    else:
        failed_tests.append("POST /backgrounds")
    
    # Test 5: GET /api/backgrounds
    success = test_get_backgrounds()
    if success:
        passed_tests.append("GET /backgrounds")
    else:
        failed_tests.append("GET /backgrounds")
    
    # Test 6: POST /api/videos
    success, video_id = test_create_video()
    if success:
        passed_tests.append("POST /videos")
    else:
        failed_tests.append("POST /videos")
    
    # Test 7: GET /api/videos
    success = test_get_videos()
    if success:
        passed_tests.append("GET /videos")
    else:
        failed_tests.append("GET /videos")
    
    # Test 8: GET /api/videos/{video_id}
    if video_id:
        success = test_get_specific_video(video_id)
        if success:
            passed_tests.append("GET /videos/{id}")
        else:
            failed_tests.append("GET /videos/{id}")
    else:
        failed_tests.append("GET /videos/{id} - skipped due to missing video_id")
    
    # Test 9: DELETE /api/videos/{video_id}
    if video_id:
        success = test_delete_video(video_id)
        if success:
            passed_tests.append("DELETE /videos/{id}")
        else:
            failed_tests.append("DELETE /videos/{id}")
    else:
        failed_tests.append("DELETE /videos/{id} - skipped due to missing video_id")
    
    # Test 10: DELETE /api/backgrounds/{background_id}
    if background_id:
        success = test_delete_background(background_id)
        if success:
            passed_tests.append("DELETE /backgrounds/{id}")
        else:
            failed_tests.append("DELETE /backgrounds/{id}")
    else:
        failed_tests.append("DELETE /backgrounds/{id} - skipped due to missing background_id")
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {len(passed_tests) + len(failed_tests)}")
    print(f"Passed: {len(passed_tests)}")
    print(f"Failed: {len(failed_tests)}")
    
    if passed_tests:
        print(f"\n✅ PASSED TESTS ({len(passed_tests)}):")
        for test in passed_tests:
            print(f"  ✓ {test}")
    
    if failed_tests:
        print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"  ✗ {test}")
    
    print(f"\nTest completed at: {datetime.now()}")
    
    return len(failed_tests) == 0

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)