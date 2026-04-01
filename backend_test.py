#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SalaryTrackerAPITester:
    def __init__(self, base_url="https://income-ledger-30.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1775078327577"  # From mongosh creation
        self.user_id = "test-user-1775078327577"
        self.tests_run = 0
        self.tests_passed = 0
        self.job_id = None
        self.log_id = None
        self.payment_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add session token to Authorization header
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_me(self):
        """Test getting current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_summary(self):
        """Test dashboard summary (should work even with no data)"""
        success, response = self.run_test(
            "Dashboard Summary",
            "GET",
            "dashboard/summary",
            200
        )
        return success

    def test_get_jobs_empty(self):
        """Test getting jobs when none exist"""
        success, response = self.run_test(
            "Get Jobs (Empty)",
            "GET",
            "jobs",
            200
        )
        return success

    def test_create_job(self):
        """Test creating a job"""
        success, response = self.run_test(
            "Create Job",
            "POST",
            "jobs",
            200,
            data={
                "job_name": "Test Web Development",
                "hourly_rate": 50.00
            }
        )
        if success and 'job_id' in response:
            self.job_id = response['job_id']
            print(f"   Created job with ID: {self.job_id}")
        return success

    def test_get_jobs_with_data(self):
        """Test getting jobs after creating one"""
        success, response = self.run_test(
            "Get Jobs (With Data)",
            "GET",
            "jobs",
            200
        )
        return success

    def test_update_job(self):
        """Test updating a job"""
        if not self.job_id:
            print("❌ Skipping job update - no job_id available")
            return False
            
        success, response = self.run_test(
            "Update Job",
            "PUT",
            f"jobs/{self.job_id}",
            200,
            data={
                "job_name": "Updated Web Development",
                "hourly_rate": 55.00
            }
        )
        return success

    def test_create_hours_log(self):
        """Test creating hours log"""
        if not self.job_id:
            print("❌ Skipping hours log creation - no job_id available")
            return False
            
        success, response = self.run_test(
            "Create Hours Log",
            "POST",
            "hours",
            200,
            data={
                "job_id": self.job_id,
                "date": "2024-01-15",
                "hours_worked": 8.0
            }
        )
        if success and 'log_id' in response:
            self.log_id = response['log_id']
            print(f"   Created hours log with ID: {self.log_id}")
        return success

    def test_get_hours(self):
        """Test getting hours logs"""
        success, response = self.run_test(
            "Get Hours Logs",
            "GET",
            "hours",
            200
        )
        return success

    def test_create_payment(self):
        """Test creating payment"""
        success, response = self.run_test(
            "Create Payment",
            "POST",
            "payments",
            200,
            data={
                "job_id": self.job_id,
                "amount": 400.00,
                "date": "2024-01-16",
                "notes": "Test payment"
            }
        )
        if success and 'payment_id' in response:
            self.payment_id = response['payment_id']
            print(f"   Created payment with ID: {self.payment_id}")
        return success

    def test_get_payments(self):
        """Test getting payments"""
        success, response = self.run_test(
            "Get Payments",
            "GET",
            "payments",
            200
        )
        return success

    def test_dashboard_summary_with_data(self):
        """Test dashboard summary with actual data"""
        success, response = self.run_test(
            "Dashboard Summary (With Data)",
            "GET",
            "dashboard/summary",
            200
        )
        if success:
            print(f"   Total Earnings: ${response.get('total_earnings', 0)}")
            print(f"   Total Payments: ${response.get('total_payments', 0)}")
            print(f"   Balance: ${response.get('balance', 0)}")
            print(f"   Total Hours: {response.get('total_hours', 0)}")
            print(f"   Active Jobs: {response.get('active_jobs', 0)}")
        return success

    def test_delete_hours_log(self):
        """Test deleting hours log"""
        if not self.log_id:
            print("❌ Skipping hours log deletion - no log_id available")
            return False
            
        success, response = self.run_test(
            "Delete Hours Log",
            "DELETE",
            f"hours/{self.log_id}",
            200
        )
        return success

    def test_delete_payment(self):
        """Test deleting payment"""
        if not self.payment_id:
            print("❌ Skipping payment deletion - no payment_id available")
            return False
            
        success, response = self.run_test(
            "Delete Payment",
            "DELETE",
            f"payments/{self.payment_id}",
            200
        )
        return success

    def test_delete_job(self):
        """Test deleting job"""
        if not self.job_id:
            print("❌ Skipping job deletion - no job_id available")
            return False
            
        success, response = self.run_test(
            "Delete Job",
            "DELETE",
            f"jobs/{self.job_id}",
            200
        )
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting Salary Tracker API Tests")
    print("=" * 50)
    
    tester = SalaryTrackerAPITester()
    
    # Test sequence
    test_sequence = [
        tester.test_auth_me,
        tester.test_dashboard_summary,
        tester.test_get_jobs_empty,
        tester.test_create_job,
        tester.test_get_jobs_with_data,
        tester.test_update_job,
        tester.test_create_hours_log,
        tester.test_get_hours,
        tester.test_create_payment,
        tester.test_get_payments,
        tester.test_dashboard_summary_with_data,
        tester.test_delete_hours_log,
        tester.test_delete_payment,
        tester.test_delete_job,
        tester.test_logout
    ]
    
    # Run all tests
    for test_func in test_sequence:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test {test_func.__name__} failed with exception: {e}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())