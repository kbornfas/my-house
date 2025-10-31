"""
Database models for My House application
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Bill(db.Model):
    """Model for tracking bills"""
    __tablename__ = 'bills'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    paid = db.Column(db.Boolean, default=False)
    recurring = db.Column(db.Boolean, default=False)
    recurring_interval = db.Column(db.String(50), default='monthly')  # daily, weekly, monthly, yearly
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'amount': self.amount,
            'due_date': self.due_date.isoformat(),
            'paid': self.paid,
            'recurring': self.recurring,
            'recurring_interval': self.recurring_interval,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class ShoppingItem(db.Model):
    """Model for shopping list items"""
    __tablename__ = 'shopping_items'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    category = db.Column(db.String(100), default='general')
    priority = db.Column(db.String(50), default='medium')  # low, medium, high
    purchased = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'category': self.category,
            'priority': self.priority,
            'purchased': self.purchased,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class HouseholdItem(db.Model):
    """Model for household items with refill/renewal reminders"""
    __tablename__ = 'household_items'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), default='general')
    current_quantity = db.Column(db.Integer, default=1)
    min_quantity = db.Column(db.Integer, default=1)
    expiry_date = db.Column(db.DateTime, nullable=True)
    refill_reminder_days = db.Column(db.Integer, default=7)  # Days before expiry to remind
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'current_quantity': self.current_quantity,
            'min_quantity': self.min_quantity,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'refill_reminder_days': self.refill_reminder_days,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
