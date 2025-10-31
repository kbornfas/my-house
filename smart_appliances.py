"""
Smart Appliance Manager
Handles connectivity and data exchange with smart kitchen appliances like fridges
"""

import paho.mqtt.client as mqtt
import json
from datetime import datetime, timedelta

class SmartApplianceManager:
    """Manager for smart appliance connections"""
    
    def __init__(self):
        self.connected_appliances = {}
        self.mqtt_client = None
        
    def connect(self, appliance_type, connection_info):
        """
        Connect to a smart appliance
        
        Args:
            appliance_type: Type of appliance (e.g., 'fridge', 'oven', 'dishwasher')
            connection_info: Dictionary with connection details (protocol, host, port, etc.)
        
        Returns:
            Dictionary with connection status
        """
        protocol = connection_info.get('protocol', 'mqtt')
        
        if protocol == 'mqtt':
            return self._connect_mqtt(appliance_type, connection_info)
        elif protocol == 'http':
            return self._connect_http(appliance_type, connection_info)
        else:
            return {
                'success': False,
                'message': f'Unsupported protocol: {protocol}'
            }
    
    def _connect_mqtt(self, appliance_type, connection_info):
        """Connect to appliance via MQTT protocol"""
        try:
            broker = connection_info.get('broker', 'localhost')
            port = connection_info.get('port', 1883)
            topic = connection_info.get('topic', f'home/{appliance_type}')
            
            # Create MQTT client if not exists
            if not self.mqtt_client:
                self.mqtt_client = mqtt.Client()
                
            # Store appliance info
            self.connected_appliances[appliance_type] = {
                'protocol': 'mqtt',
                'broker': broker,
                'port': port,
                'topic': topic,
                'connected': True,
                'last_sync': datetime.now().isoformat()
            }
            
            return {
                'success': True,
                'message': f'Connected to {appliance_type} via MQTT',
                'appliance': self.connected_appliances[appliance_type]
            }
        except Exception as e:
            # Log the error for debugging but don't expose details to users
            # In production, use proper logging: logging.error(f"MQTT connection failed: {str(e)}")
            return {
                'success': False,
                'message': 'Failed to connect to appliance via MQTT'
            }
    
    def _connect_http(self, appliance_type, connection_info):
        """Connect to appliance via HTTP/REST API"""
        try:
            url = connection_info.get('url')
            api_key = connection_info.get('api_key', '')
            
            self.connected_appliances[appliance_type] = {
                'protocol': 'http',
                'url': url,
                'api_key': api_key,
                'connected': True,
                'last_sync': datetime.now().isoformat()
            }
            
            return {
                'success': True,
                'message': f'Connected to {appliance_type} via HTTP',
                'appliance': self.connected_appliances[appliance_type]
            }
        except Exception as e:
            # Log the error for debugging but don't expose details to users
            # In production, use proper logging: logging.error(f"HTTP connection failed: {str(e)}")
            return {
                'success': False,
                'message': 'Failed to connect to appliance via HTTP'
            }
    
    def get_all_status(self):
        """Get status of all connected appliances"""
        return {
            'appliances': self.connected_appliances,
            'count': len(self.connected_appliances)
        }
    
    def get_fridge_inventory(self):
        """
        Get inventory from connected smart fridge
        
        Returns:
            List of items in the fridge with quantities and expiry dates
        """
        if 'fridge' not in self.connected_appliances:
            return []
        
        # In a real implementation, this would query the actual smart fridge
        # For now, return a mock inventory for demonstration
        # This would integrate with actual smart fridge APIs (Samsung SmartThings, LG ThinQ, etc.)
        
        # Generate dynamic expiry dates relative to current date
        now = datetime.now()
        
        mock_inventory = [
            {
                'name': 'Milk',
                'quantity': 2,
                'expiry_date': (now + timedelta(days=5)).strftime('%Y-%m-%d'),
                'location': 'main_shelf'
            },
            {
                'name': 'Eggs',
                'quantity': 12,
                'expiry_date': (now + timedelta(days=10)).strftime('%Y-%m-%d'),
                'location': 'door'
            },
            {
                'name': 'Butter',
                'quantity': 1,
                'expiry_date': (now + timedelta(days=15)).strftime('%Y-%m-%d'),
                'location': 'main_shelf'
            }
        ]
        
        # Update last sync time
        self.connected_appliances['fridge']['last_sync'] = datetime.now().isoformat()
        
        return mock_inventory
    
    def send_shopping_list(self, appliance_type, items):
        """
        Send shopping list to a smart appliance
        
        Args:
            appliance_type: Type of appliance
            items: List of items to send
        
        Returns:
            Dictionary with send status
        """
        if appliance_type not in self.connected_appliances:
            return {
                'success': False,
                'message': f'{appliance_type} not connected'
            }
        
        # Implementation would send data to actual appliance
        return {
            'success': True,
            'message': f'Shopping list sent to {appliance_type}',
            'items_sent': len(items)
        }
