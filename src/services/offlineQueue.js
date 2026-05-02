// IndexedDB offline queue implementation for receipt scanner

class OfflineQueue {
    constructor(dbName = 'OfflineQueueDB', storeName = 'receipts') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName);
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                if (!this.db.objectStoreNames.contains(this.storeName)) {
                    this.db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            request.onerror = (event) => {
                reject('Database error: ' + event.target.errorCode);
            };
        });
    }

    async enqueue(receipt) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(receipt);
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Failed to add receipt to queue.');
        });
    }

    async dequeue() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const getRequest = store.getAll();
            getRequest.onsuccess = (event) => {
                const receipts = event.target.result;
                if (receipts.length > 0) {
                    const firstReceipt = receipts[0];
                    store.delete(firstReceipt.id);
                    resolve(firstReceipt);
                } else {
                    resolve(null);
                }
            };
            getRequest.onerror = () => reject('Failed to retrieve receipts from queue.');
        });
    }
}

export default OfflineQueue;