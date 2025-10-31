# API Usage Examples

This document provides comprehensive examples of how to use the My House API.

## Table of Contents
- [Starting the Application](#starting-the-application)
- [Bill Management](#bill-management)
- [Shopping List](#shopping-list)
- [Household Items](#household-items)
- [Smart Appliances](#smart-appliances)

## Starting the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

The API will be available at `http://localhost:5000`

## Bill Management

### Create a New Bill

```bash
curl -X POST http://localhost:5000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electricity Bill",
    "amount": 150.50,
    "due_date": "2025-11-15T00:00:00",
    "recurring": true,
    "recurring_interval": "monthly"
  }'
```

Response:
```json
{
  "id": 1,
  "name": "Electricity Bill",
  "amount": 150.5,
  "due_date": "2025-11-15T00:00:00",
  "paid": false,
  "recurring": true,
  "recurring_interval": "monthly",
  "created_at": "2025-10-31T01:00:00",
  "updated_at": "2025-10-31T01:00:00"
}
```

### Get All Bills

```bash
curl http://localhost:5000/api/bills
```

### Get Upcoming Bills (Next 7 Days)

```bash
curl http://localhost:5000/api/bills/upcoming?days=7
```

### Mark Bill as Paid

```bash
curl -X PUT http://localhost:5000/api/bills/1 \
  -H "Content-Type: application/json" \
  -d '{"paid": true}'
```

### Delete a Bill

```bash
curl -X DELETE http://localhost:5000/api/bills/1
```

## Shopping List

### Add Item to Shopping List

```bash
curl -X POST http://localhost:5000/api/shopping \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Milk",
    "quantity": 2,
    "category": "dairy",
    "priority": "high"
  }'
```

Response:
```json
{
  "id": 1,
  "name": "Milk",
  "quantity": 2,
  "category": "dairy",
  "priority": "high",
  "purchased": false,
  "created_at": "2025-10-31T01:00:00",
  "updated_at": "2025-10-31T01:00:00"
}
```

### Get Shopping List

```bash
curl http://localhost:5000/api/shopping
```

### Mark Item as Purchased

```bash
curl -X PUT http://localhost:5000/api/shopping/1 \
  -H "Content-Type: application/json" \
  -d '{"purchased": true}'
```

### Update Item Quantity

```bash
curl -X PUT http://localhost:5000/api/shopping/1 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'
```

## Household Items

### Add Household Item

```bash
curl -X POST http://localhost:5000/api/household-items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laundry Detergent",
    "category": "cleaning",
    "current_quantity": 1,
    "min_quantity": 2,
    "expiry_date": "2026-12-31T00:00:00",
    "refill_reminder_days": 30
  }'
```

Response:
```json
{
  "id": 1,
  "name": "Laundry Detergent",
  "category": "cleaning",
  "current_quantity": 1,
  "min_quantity": 2,
  "expiry_date": "2026-12-31T00:00:00",
  "refill_reminder_days": 30,
  "created_at": "2025-10-31T01:00:00",
  "updated_at": "2025-10-31T01:00:00"
}
```

### Get All Household Items

```bash
curl http://localhost:5000/api/household-items
```

### Get Refill/Expiry Reminders

This endpoint returns items that:
- Have quantity at or below minimum threshold
- Are expiring soon (within refill_reminder_days)

```bash
curl http://localhost:5000/api/household-items/reminders
```

Response:
```json
[
  {
    "item": {
      "id": 1,
      "name": "Laundry Detergent",
      "current_quantity": 1,
      "min_quantity": 2
    },
    "type": "low_quantity",
    "message": "Laundry Detergent is running low (current: 1, min: 2)"
  }
]
```

### Update Item Quantity

```bash
curl -X PUT http://localhost:5000/api/household-items/1 \
  -H "Content-Type: application/json" \
  -d '{"current_quantity": 5}'
```

## Smart Appliances

### Connect to Smart Fridge (MQTT)

```bash
curl -X POST http://localhost:5000/api/appliances/connect \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fridge",
    "connection_info": {
      "protocol": "mqtt",
      "broker": "localhost",
      "port": 1883,
      "topic": "home/kitchen/fridge"
    }
  }'
```

Response:
```json
{
  "success": true,
  "message": "Connected to fridge via MQTT",
  "appliance": {
    "protocol": "mqtt",
    "broker": "localhost",
    "port": 1883,
    "topic": "home/kitchen/fridge",
    "connected": true,
    "last_sync": "2025-10-31T01:00:00"
  }
}
```

### Connect to Smart Appliance (HTTP/REST)

For appliances with REST APIs (e.g., Samsung SmartThings, LG ThinQ):

```bash
curl -X POST http://localhost:5000/api/appliances/connect \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fridge",
    "connection_info": {
      "protocol": "http",
      "url": "https://api.smartthings.com/v1/devices/fridge-id",
      "api_key": "your-api-key-here"
    }
  }'
```

### Get Connected Appliances Status

```bash
curl http://localhost:5000/api/appliances/status
```

Response:
```json
{
  "appliances": {
    "fridge": {
      "protocol": "mqtt",
      "broker": "localhost",
      "port": 1883,
      "topic": "home/kitchen/fridge",
      "connected": true,
      "last_sync": "2025-10-31T01:00:00"
    }
  },
  "count": 1
}
```

### Get Smart Fridge Inventory

```bash
curl http://localhost:5000/api/appliances/fridge/inventory
```

Response:
```json
[
  {
    "name": "Milk",
    "quantity": 2,
    "expiry_date": "2025-11-05",
    "location": "main_shelf"
  },
  {
    "name": "Eggs",
    "quantity": 12,
    "expiry_date": "2025-11-10",
    "location": "door"
  }
]
```

### Sync Household Items with Smart Fridge

This endpoint syncs inventory from your smart fridge to household items:

```bash
curl -X POST http://localhost:5000/api/appliances/sync
```

Response:
```json
{
  "synced_items": ["Milk", "Eggs", "Butter"],
  "count": 3
}
```

## Python Usage Examples

### Using the API with Python

```python
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api"

# Create a bill
bill = {
    "name": "Water Bill",
    "amount": 45.00,
    "due_date": (datetime.now() + timedelta(days=15)).isoformat(),
    "recurring": True,
    "recurring_interval": "monthly"
}
response = requests.post(f"{BASE_URL}/bills", json=bill)
print(response.json())

# Get upcoming bills
response = requests.get(f"{BASE_URL}/bills/upcoming?days=30")
bills = response.json()
for bill in bills:
    print(f"{bill['name']}: ${bill['amount']} due {bill['due_date']}")

# Add to shopping list
item = {
    "name": "Coffee",
    "quantity": 1,
    "category": "beverages",
    "priority": "high"
}
response = requests.post(f"{BASE_URL}/shopping", json=item)
print(response.json())

# Check reminders
response = requests.get(f"{BASE_URL}/household-items/reminders")
reminders = response.json()
for reminder in reminders:
    print(f"⚠️  {reminder['message']}")
```

## Complete Workflow Example

Here's a complete workflow showing how to use the system:

```bash
# 1. Start the application
python app.py

# 2. Add bills
curl -X POST http://localhost:5000/api/bills \
  -H "Content-Type: application/json" \
  -d '{"name": "Rent", "amount": 1200, "due_date": "2025-11-01T00:00:00", "recurring": true, "recurring_interval": "monthly"}'

# 3. Create shopping list
curl -X POST http://localhost:5000/api/shopping \
  -H "Content-Type: application/json" \
  -d '{"name": "Eggs", "quantity": 12, "category": "dairy", "priority": "high"}'

# 4. Add household items
curl -X POST http://localhost:5000/api/household-items \
  -H "Content-Type: application/json" \
  -d '{"name": "Coffee", "category": "food", "current_quantity": 1, "min_quantity": 3, "refill_reminder_days": 7}'

# 5. Connect smart fridge
curl -X POST http://localhost:5000/api/appliances/connect \
  -H "Content-Type: application/json" \
  -d '{"type": "fridge", "connection_info": {"protocol": "mqtt", "broker": "localhost", "port": 1883}}'

# 6. Sync with smart fridge
curl -X POST http://localhost:5000/api/appliances/sync

# 7. Check what needs attention
curl http://localhost:5000/api/household-items/reminders
curl http://localhost:5000/api/bills/upcoming?days=7
```

## Integration with Smart Home Platforms

### Samsung SmartThings

```json
{
  "type": "fridge",
  "connection_info": {
    "protocol": "http",
    "url": "https://api.smartthings.com/v1/devices/{deviceId}",
    "api_key": "Bearer YOUR_SMARTTHINGS_TOKEN"
  }
}
```

### LG ThinQ

```json
{
  "type": "fridge",
  "connection_info": {
    "protocol": "http",
    "url": "https://aic-service.lgthinq.com/devices/{deviceId}",
    "api_key": "YOUR_LG_THINQ_TOKEN"
  }
}
```

### Home Assistant (MQTT)

```json
{
  "type": "fridge",
  "connection_info": {
    "protocol": "mqtt",
    "broker": "homeassistant.local",
    "port": 1883,
    "topic": "homeassistant/sensor/fridge"
  }
}
```
