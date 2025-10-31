# My House - Personal Fortress

A comprehensive household management system for tracking bills, shopping lists, and household items with smart appliance integration.

## Features

### 📋 Bill Tracking
- Track all household bills with due dates
- Support for recurring bills (daily, weekly, monthly, yearly)
- Mark bills as paid
- Get upcoming bill reminders

### 🛒 Shopping List Management
- Create and manage shopping lists
- Categorize items
- Set priorities (low, medium, high)
- Track purchased items

### 🏠 Household Item Tracking
- Monitor household items and quantities
- Set minimum quantity thresholds for refill alerts
- Track expiry dates
- Automatic reminders for refilling or renewal

### 📱 Smart Appliance Integration
- Connect to smart kitchen appliances (fridges, ovens, etc.)
- Sync inventory from smart fridges
- Support for MQTT and HTTP/REST protocols
- Compatible with major smart home ecosystems

## Installation

1. Clone the repository:
```bash
git clone https://github.com/kbornfas/my-house.git
cd my-house
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the application:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create a new bill
- `GET /api/bills/<id>` - Get a specific bill
- `PUT /api/bills/<id>` - Update a bill
- `DELETE /api/bills/<id>` - Delete a bill
- `GET /api/bills/upcoming?days=7` - Get upcoming bills

### Shopping List
- `GET /api/shopping` - Get active shopping items
- `POST /api/shopping` - Add item to shopping list
- `GET /api/shopping/<id>` - Get a specific shopping item
- `PUT /api/shopping/<id>` - Update shopping item
- `DELETE /api/shopping/<id>` - Delete shopping item

### Household Items
- `GET /api/household-items` - Get all household items
- `POST /api/household-items` - Add household item
- `GET /api/household-items/<id>` - Get a specific item
- `PUT /api/household-items/<id>` - Update household item
- `DELETE /api/household-items/<id>` - Delete household item
- `GET /api/household-items/reminders` - Get refill/expiry reminders

### Smart Appliances
- `POST /api/appliances/connect` - Connect to a smart appliance
- `GET /api/appliances/status` - Get status of connected appliances
- `GET /api/appliances/fridge/inventory` - Get smart fridge inventory
- `POST /api/appliances/sync` - Sync household items with appliances

## Usage Examples

### Create a Bill
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

### Add Shopping Item
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

### Connect Smart Fridge
```bash
curl -X POST http://localhost:5000/api/appliances/connect \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fridge",
    "connection_info": {
      "protocol": "mqtt",
      "broker": "localhost",
      "port": 1883,
      "topic": "home/fridge"
    }
  }'
```

### Sync with Smart Fridge
```bash
curl -X POST http://localhost:5000/api/appliances/sync
```

## Smart Appliance Protocols

### MQTT
Connect appliances using MQTT protocol (ideal for IoT devices):
```json
{
  "type": "fridge",
  "connection_info": {
    "protocol": "mqtt",
    "broker": "mqtt.example.com",
    "port": 1883,
    "topic": "home/kitchen/fridge"
  }
}
```

### HTTP/REST
Connect appliances with REST APIs (e.g., Samsung SmartThings, LG ThinQ):
```json
{
  "type": "fridge",
  "connection_info": {
    "protocol": "http",
    "url": "https://api.smartthings.com/v1/devices/fridge-id",
    "api_key": "your-api-key"
  }
}
```

## Architecture

- **app.py** - Main Flask application with API endpoints
- **models.py** - SQLAlchemy database models
- **smart_appliances.py** - Smart appliance integration layer
- **requirements.txt** - Python dependencies

## Database Schema

### Bills Table
- id, name, amount, due_date, paid, recurring, recurring_interval, created_at, updated_at

### Shopping Items Table
- id, name, quantity, category, priority, purchased, created_at, updated_at

### Household Items Table
- id, name, category, current_quantity, min_quantity, expiry_date, refill_reminder_days, created_at, updated_at

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
