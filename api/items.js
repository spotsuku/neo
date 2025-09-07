// Simple Items API module
class ItemsAPI {
  constructor() {
    this.items = [
      { id: 1, name: 'Sample Item 1', description: 'This is a sample item', created: new Date().toISOString() },
      { id: 2, name: 'Sample Item 2', description: 'Another sample item', created: new Date().toISOString() },
    ];
  }

  getAll() {
    return {
      success: true,
      data: this.items,
      count: this.items.length
    };
  }

  getById(id) {
    const item = this.items.find(item => item.id === parseInt(id));
    if (item) {
      return { success: true, data: item };
    } else {
      return { success: false, error: 'Item not found' };
    }
  }

  create(itemData) {
    const newItem = {
      id: this.items.length + 1,
      ...itemData,
      created: new Date().toISOString()
    };
    this.items.push(newItem);
    return { success: true, data: newItem };
  }

  update(id, itemData) {
    const index = this.items.findIndex(item => item.id === parseInt(id));
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...itemData, updated: new Date().toISOString() };
      return { success: true, data: this.items[index] };
    } else {
      return { success: false, error: 'Item not found' };
    }
  }

  delete(id) {
    const index = this.items.findIndex(item => item.id === parseInt(id));
    if (index !== -1) {
      const deletedItem = this.items.splice(index, 1)[0];
      return { success: true, data: deletedItem };
    } else {
      return { success: false, error: 'Item not found' };
    }
  }
}

module.exports = { ItemsAPI };