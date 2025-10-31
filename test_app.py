"""
Basic tests for My House application
"""

import unittest
import json
from datetime import datetime, timedelta
from app import app, db
from models import Bill, ShoppingItem, HouseholdItem

class MyHouseTestCase(unittest.TestCase):
    
    def setUp(self):
        """Set up test client and database"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = app.test_client()
        
        with app.app_context():
            db.create_all()
    
    def tearDown(self):
        """Clean up after tests"""
        with app.app_context():
            db.session.remove()
            db.drop_all()
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = self.app.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
    
    def test_create_bill(self):
        """Test creating a bill"""
        bill_data = {
            'name': 'Test Bill',
            'amount': 100.0,
            'due_date': (datetime.now() + timedelta(days=7)).isoformat(),
            'recurring': False
        }
        response = self.app.post('/api/bills',
                                data=json.dumps(bill_data),
                                content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Test Bill')
        self.assertEqual(data['amount'], 100.0)
    
    def test_get_bills(self):
        """Test getting all bills"""
        response = self.app.get('/api/bills')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_create_shopping_item(self):
        """Test creating a shopping item"""
        item_data = {
            'name': 'Milk',
            'quantity': 2,
            'category': 'dairy',
            'priority': 'high'
        }
        response = self.app.post('/api/shopping',
                                data=json.dumps(item_data),
                                content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Milk')
        self.assertEqual(data['quantity'], 2)
    
    def test_get_shopping_items(self):
        """Test getting shopping items"""
        response = self.app.get('/api/shopping')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_create_household_item(self):
        """Test creating a household item"""
        item_data = {
            'name': 'Detergent',
            'category': 'cleaning',
            'current_quantity': 2,
            'min_quantity': 1,
            'expiry_date': (datetime.now() + timedelta(days=365)).isoformat(),
            'refill_reminder_days': 30
        }
        response = self.app.post('/api/household-items',
                                data=json.dumps(item_data),
                                content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Detergent')
        self.assertEqual(data['current_quantity'], 2)
    
    def test_get_household_items(self):
        """Test getting household items"""
        response = self.app.get('/api/household-items')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_get_reminders(self):
        """Test getting reminders for low quantity items"""
        response = self.app.get('/api/household-items/reminders')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_connect_appliance(self):
        """Test connecting a smart appliance"""
        appliance_data = {
            'type': 'fridge',
            'connection_info': {
                'protocol': 'mqtt',
                'broker': 'localhost',
                'port': 1883,
                'topic': 'home/fridge'
            }
        }
        response = self.app.post('/api/appliances/connect',
                                data=json.dumps(appliance_data),
                                content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
    
    def test_get_appliance_status(self):
        """Test getting appliance status"""
        response = self.app.get('/api/appliances/status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('appliances', data)
        self.assertIn('count', data)
    
    def test_get_fridge_inventory(self):
        """Test getting fridge inventory"""
        # First connect a fridge
        appliance_data = {
            'type': 'fridge',
            'connection_info': {
                'protocol': 'mqtt',
                'broker': 'localhost',
                'port': 1883,
                'topic': 'home/fridge'
            }
        }
        self.app.post('/api/appliances/connect',
                     data=json.dumps(appliance_data),
                     content_type='application/json')
        
        # Get inventory
        response = self.app.get('/api/appliances/fridge/inventory')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)

if __name__ == '__main__':
    unittest.main()
