const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos_buffet_menu';

async function updateRBACConfiguration() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const rbacCollection = db.collection('rbac');
    
    // Update waiter role configuration
    const waiterUpdate = await rbacCollection.updateOne(
      { role: 'waiter' },
      {
        $set: {
          permissions: [
            'orders.view', 'orders.create', 'orders.edit',
            'payments.view', 'payments.process', 'my-payments.view',
            'tables.view',
            'products.view',
            'categories.view'
          ],
          navigationItems: ['profile', 'payments', 'my-payments', 'products', 'categories'],
          updatedAt: new Date()
        },
        $setOnInsert: {
          role: 'waiter',
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log('Waiter role updated:', waiterUpdate);
    
    // Verify the update
    const waiterRole = await rbacCollection.findOne({ role: 'waiter' });
    console.log('Updated waiter role configuration:', JSON.stringify(waiterRole, null, 2));
    
  } catch (error) {
    console.error('Error updating RBAC configuration:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

updateRBACConfiguration();