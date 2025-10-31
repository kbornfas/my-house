#!/usr/bin/env python3
"""
Example usage script for My House API
Demonstrates all the main features
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api"

def print_section(title):
    """Print a section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def main():
    print("My House - Personal Fortress Demo")
    print("Make sure the app is running: python app.py")
    
    # Health Check
    print_section("Health Check")
    response = requests.get(f"{BASE_URL}/health")
    print(json.dumps(response.json(), indent=2))
    
    # Create Bills
    print_section("Creating Bills")
    
    bill1 = {
        "name": "Electricity Bill",
        "amount": 150.50,
        "due_date": (datetime.now() + timedelta(days=10)).isoformat(),
        "recurring": True,
        "recurring_interval": "monthly"
    }
    response = requests.post(f"{BASE_URL}/bills", json=bill1)
    print(f"Created bill: {response.json()['name']} - ${response.json()['amount']}")
    
    bill2 = {
        "name": "Internet Bill",
        "amount": 79.99,
        "due_date": (datetime.now() + timedelta(days=5)).isoformat(),
        "recurring": True,
        "recurring_interval": "monthly"
    }
    response = requests.post(f"{BASE_URL}/bills", json=bill2)
    print(f"Created bill: {response.json()['name']} - ${response.json()['amount']}")
    
    # Get Upcoming Bills
    print_section("Upcoming Bills (Next 7 Days)")
    response = requests.get(f"{BASE_URL}/bills/upcoming?days=7")
    bills = response.json()
    for bill in bills:
        print(f"  - {bill['name']}: ${bill['amount']} due on {bill['due_date'][:10]}")
    
    # Create Shopping List
    print_section("Creating Shopping List")
    
    shopping_items = [
        {"name": "Milk", "quantity": 2, "category": "dairy", "priority": "high"},
        {"name": "Bread", "quantity": 1, "category": "bakery", "priority": "high"},
        {"name": "Apples", "quantity": 6, "category": "produce", "priority": "medium"},
        {"name": "Dish Soap", "quantity": 1, "category": "cleaning", "priority": "low"}
    ]
    
    for item in shopping_items:
        response = requests.post(f"{BASE_URL}/shopping", json=item)
        print(f"Added to list: {item['quantity']}x {item['name']} ({item['priority']} priority)")
    
    # Get Shopping List
    print_section("Current Shopping List")
    response = requests.get(f"{BASE_URL}/shopping")
    items = response.json()
    for item in items:
        print(f"  [ ] {item['quantity']}x {item['name']} - {item['category']}")
    
    # Create Household Items
    print_section("Creating Household Items")
    
    household_items = [
        {
            "name": "Laundry Detergent",
            "category": "cleaning",
            "current_quantity": 1,
            "min_quantity": 2,
            "expiry_date": (datetime.now() + timedelta(days=365)).isoformat(),
            "refill_reminder_days": 30
        },
        {
            "name": "Coffee",
            "category": "food",
            "current_quantity": 1,
            "min_quantity": 3,
            "expiry_date": (datetime.now() + timedelta(days=90)).isoformat(),
            "refill_reminder_days": 14
        },
        {
            "name": "Toothpaste",
            "category": "personal care",
            "current_quantity": 2,
            "min_quantity": 2,
            "expiry_date": (datetime.now() + timedelta(days=5)).isoformat(),
            "refill_reminder_days": 7
        }
    ]
    
    for item in household_items:
        response = requests.post(f"{BASE_URL}/household-items", json=item)
        print(f"Added: {item['name']} (qty: {item['current_quantity']}, min: {item['min_quantity']})")
    
    # Get Reminders
    print_section("Household Item Reminders")
    response = requests.get(f"{BASE_URL}/household-items/reminders")
    reminders = response.json()
    
    if reminders:
        for reminder in reminders:
            print(f"  ⚠️  {reminder['message']}")
    else:
        print("  ✅ No reminders - all items are well stocked!")
    
    # Connect Smart Fridge
    print_section("Connecting Smart Fridge")
    
    appliance_config = {
        "type": "fridge",
        "connection_info": {
            "protocol": "mqtt",
            "broker": "localhost",
            "port": 1883,
            "topic": "home/kitchen/fridge"
        }
    }
    
    response = requests.post(f"{BASE_URL}/appliances/connect", json=appliance_config)
    result = response.json()
    if result['success']:
        print(f"✅ {result['message']}")
    
    # Get Fridge Inventory
    print_section("Smart Fridge Inventory")
    response = requests.get(f"{BASE_URL}/appliances/fridge/inventory")
    inventory = response.json()
    
    for item in inventory:
        print(f"  📦 {item['name']}: {item['quantity']} (expires: {item['expiry_date']})")
    
    # Sync with Smart Fridge
    print_section("Syncing with Smart Fridge")
    response = requests.post(f"{BASE_URL}/appliances/sync")
    sync_result = response.json()
    print(f"Synced {sync_result['count']} items from smart fridge")
    print(f"Items: {', '.join(sync_result['synced_items'])}")
    
    # Get Appliance Status
    print_section("Connected Appliances Status")
    response = requests.get(f"{BASE_URL}/appliances/status")
    status = response.json()
    print(f"Total connected appliances: {status['count']}")
    for appliance_type, info in status['appliances'].items():
        print(f"  - {appliance_type.upper()}: {info['protocol']} (last sync: {info['last_sync'][:19]})")
    
    print("\n" + "="*60)
    print("Demo completed successfully!")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to the API.")
        print("Please make sure the app is running: python app.py")
    except Exception as e:
        print(f"\n❌ Error: {e}")
