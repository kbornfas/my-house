"""
My House - Personal Fortress
Household management system for tracking bills, shopping lists, and household items
"""

from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import json
import os
from models import db, Bill, ShoppingItem, HouseholdItem
from smart_appliances import SmartApplianceManager

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///my_house.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
appliance_manager = SmartApplianceManager()

# Initialize database
with app.app_context():
    db.create_all()

# Bill Management Endpoints
@app.route('/api/bills', methods=['GET', 'POST'])
def manage_bills():
    """Get all bills or create a new bill"""
    if request.method == 'GET':
        bills = Bill.query.all()
        return jsonify([bill.to_dict() for bill in bills])
    
    elif request.method == 'POST':
        data = request.get_json()
        bill = Bill(
            name=data['name'],
            amount=data['amount'],
            due_date=datetime.fromisoformat(data['due_date']),
            recurring=data.get('recurring', False),
            recurring_interval=data.get('recurring_interval', 'monthly')
        )
        db.session.add(bill)
        db.session.commit()
        return jsonify(bill.to_dict()), 201

@app.route('/api/bills/<int:bill_id>', methods=['GET', 'PUT', 'DELETE'])
def bill_detail(bill_id):
    """Get, update or delete a specific bill"""
    bill = Bill.query.get_or_404(bill_id)
    
    if request.method == 'GET':
        return jsonify(bill.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        bill.name = data.get('name', bill.name)
        bill.amount = data.get('amount', bill.amount)
        if 'due_date' in data:
            bill.due_date = datetime.fromisoformat(data['due_date'])
        bill.paid = data.get('paid', bill.paid)
        bill.recurring = data.get('recurring', bill.recurring)
        bill.recurring_interval = data.get('recurring_interval', bill.recurring_interval)
        db.session.commit()
        return jsonify(bill.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(bill)
        db.session.commit()
        return '', 204

@app.route('/api/bills/upcoming', methods=['GET'])
def upcoming_bills():
    """Get upcoming bills (due within the next 7 days)"""
    days = request.args.get('days', 7, type=int)
    cutoff_date = datetime.now() + timedelta(days=days)
    bills = Bill.query.filter(
        Bill.due_date <= cutoff_date,
        Bill.paid == False
    ).all()
    return jsonify([bill.to_dict() for bill in bills])

# Shopping List Endpoints
@app.route('/api/shopping', methods=['GET', 'POST'])
def manage_shopping():
    """Get all shopping items or add a new item"""
    if request.method == 'GET':
        items = ShoppingItem.query.filter_by(purchased=False).all()
        return jsonify([item.to_dict() for item in items])
    
    elif request.method == 'POST':
        data = request.get_json()
        item = ShoppingItem(
            name=data['name'],
            quantity=data.get('quantity', 1),
            category=data.get('category', 'general'),
            priority=data.get('priority', 'medium')
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(item.to_dict()), 201

@app.route('/api/shopping/<int:item_id>', methods=['GET', 'PUT', 'DELETE'])
def shopping_item_detail(item_id):
    """Get, update or delete a shopping item"""
    item = ShoppingItem.query.get_or_404(item_id)
    
    if request.method == 'GET':
        return jsonify(item.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        item.name = data.get('name', item.name)
        item.quantity = data.get('quantity', item.quantity)
        item.category = data.get('category', item.category)
        item.priority = data.get('priority', item.priority)
        item.purchased = data.get('purchased', item.purchased)
        db.session.commit()
        return jsonify(item.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(item)
        db.session.commit()
        return '', 204

# Household Items Endpoints
@app.route('/api/household-items', methods=['GET', 'POST'])
def manage_household_items():
    """Get all household items or add a new item"""
    if request.method == 'GET':
        items = HouseholdItem.query.all()
        return jsonify([item.to_dict() for item in items])
    
    elif request.method == 'POST':
        data = request.get_json()
        item = HouseholdItem(
            name=data['name'],
            category=data.get('category', 'general'),
            current_quantity=data.get('current_quantity', 1),
            min_quantity=data.get('min_quantity', 1),
            expiry_date=datetime.fromisoformat(data['expiry_date']) if 'expiry_date' in data else None,
            refill_reminder_days=data.get('refill_reminder_days', 7)
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(item.to_dict()), 201

@app.route('/api/household-items/<int:item_id>', methods=['GET', 'PUT', 'DELETE'])
def household_item_detail(item_id):
    """Get, update or delete a household item"""
    item = HouseholdItem.query.get_or_404(item_id)
    
    if request.method == 'GET':
        return jsonify(item.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        item.name = data.get('name', item.name)
        item.category = data.get('category', item.category)
        item.current_quantity = data.get('current_quantity', item.current_quantity)
        item.min_quantity = data.get('min_quantity', item.min_quantity)
        if 'expiry_date' in data:
            item.expiry_date = datetime.fromisoformat(data['expiry_date']) if data['expiry_date'] else None
        item.refill_reminder_days = data.get('refill_reminder_days', item.refill_reminder_days)
        db.session.commit()
        return jsonify(item.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(item)
        db.session.commit()
        return '', 204

@app.route('/api/household-items/reminders', methods=['GET'])
def get_reminders():
    """Get items that need refilling or are expiring soon"""
    reminders = []
    items = HouseholdItem.query.all()
    
    for item in items:
        # Check if quantity is low
        if item.current_quantity <= item.min_quantity:
            reminders.append({
                'item': item.to_dict(),
                'type': 'low_quantity',
                'message': f'{item.name} is running low (current: {item.current_quantity}, min: {item.min_quantity})'
            })
        
        # Check if expiring soon
        if item.expiry_date:
            days_until_expiry = (item.expiry_date - datetime.now()).days
            if days_until_expiry <= item.refill_reminder_days:
                reminders.append({
                    'item': item.to_dict(),
                    'type': 'expiring_soon',
                    'message': f'{item.name} expires in {days_until_expiry} days'
                })
    
    return jsonify(reminders)

# Smart Appliance Endpoints
@app.route('/api/appliances/connect', methods=['POST'])
def connect_appliance():
    """Connect to a smart appliance"""
    data = request.get_json()
    result = appliance_manager.connect(
        appliance_type=data['type'],
        connection_info=data['connection_info']
    )
    return jsonify(result)

@app.route('/api/appliances/status', methods=['GET'])
def appliance_status():
    """Get status of connected appliances"""
    return jsonify(appliance_manager.get_all_status())

@app.route('/api/appliances/fridge/inventory', methods=['GET'])
def fridge_inventory():
    """Get inventory from connected smart fridge"""
    inventory = appliance_manager.get_fridge_inventory()
    return jsonify(inventory)

@app.route('/api/appliances/sync', methods=['POST'])
def sync_with_appliances():
    """Sync household items with smart appliances"""
    # Get fridge inventory and update household items
    fridge_items = appliance_manager.get_fridge_inventory()
    
    synced_items = []
    for fridge_item in fridge_items:
        # Check if item exists in household items
        existing = HouseholdItem.query.filter_by(name=fridge_item['name']).first()
        
        if existing:
            existing.current_quantity = fridge_item['quantity']
            if 'expiry_date' in fridge_item and fridge_item['expiry_date']:
                existing.expiry_date = datetime.fromisoformat(fridge_item['expiry_date'])
        else:
            # Create new household item from fridge inventory
            new_item = HouseholdItem(
                name=fridge_item['name'],
                category='food',
                current_quantity=fridge_item['quantity'],
                min_quantity=1,
                expiry_date=datetime.fromisoformat(fridge_item['expiry_date']) if fridge_item.get('expiry_date') else None
            )
            db.session.add(new_item)
        
        synced_items.append(fridge_item['name'])
    
    db.session.commit()
    return jsonify({'synced_items': synced_items, 'count': len(synced_items)})

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'My House - Personal Fortress',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
