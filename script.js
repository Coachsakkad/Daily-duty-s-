// Application State Management
class AppState {
    constructor() {
        this.tasks = this.loadFromStorage('tasks') || [];
        this.notes = this.loadFromStorage('notes') || [];
        this.transactions = this.loadFromStorage('transactions') || [];
        this.traders = this.loadFromStorage('traders') || [];
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return null;
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
            this.showToast('خطأ في حفظ البيانات. قد تكون مساحة التخزين ممتلئة.', 'danger');
            return false;
        }
    }

    // Utility method to show toast notifications
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${this.escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="إغلاق"></button>
            </div>`;
        
        document.querySelector('.toast-container').appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
        bsToast.show();
        
        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Utility method to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Utility method to show loading spinner
    showLoading() {
        document.getElementById('loadingSpinner').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.remove('show');
    }
}

// Input Validation Utilities
class Validator {
    static validateInput(input, options = {}) {
        const value = input.value.trim();
        const { minLength = 1, maxLength = Infinity, required = true } = options;

        // Clear previous validation state
        input.classList.remove('is-invalid');

        if (required && !value) {
            input.classList.add('is-invalid');
            return false;
        }

        if (value && (value.length < minLength || value.length > maxLength)) {
            input.classList.add('is-invalid');
            return false;
        }

        return true;
    }

    static validateNumber(input, options = {}) {
        const value = parseFloat(input.value);
        const { min = -Infinity, max = Infinity, required = false } = options;

        input.classList.remove('is-invalid');

        if (required && (isNaN(value) || input.value.trim() === '')) {
            input.classList.add('is-invalid');
            return false;
        }

        if (!isNaN(value) && (value < min || value > max)) {
            input.classList.add('is-invalid');
            return false;
        }

        return true;
    }

    static validateDate(input, required = true) {
        input.classList.remove('is-invalid');

        if (required && !input.value) {
            input.classList.add('is-invalid');
            return false;
        }

        if (input.value && isNaN(Date.parse(input.value))) {
            input.classList.add('is-invalid');
            return false;
        }

        return true;
    }
}

// Task Management
class TaskManager {
    constructor(appState) {
        this.appState = appState;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const taskForm = document.getElementById('taskForm');
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Add keyboard support for task input
        document.getElementById('taskInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addTask();
            }
        });
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        
        if (!Validator.validateInput(taskInput, { maxLength: 200 })) {
            taskInput.focus();
            return;
        }

        const task = {
            id: Date.now(),
            text: taskInput.value.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.appState.tasks.push(task);
        
        if (this.appState.saveToStorage('tasks', this.appState.tasks)) {
            this.renderTasks();
            taskInput.value = '';
            taskInput.classList.remove('is-invalid');
            this.appState.showToast('تم إضافة المهمة بنجاح.');
            this.updateNotifications();
        }
    }

    toggleTask(id) {
        this.appState.tasks = this.appState.tasks.map(task => 
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        
        if (this.appState.saveToStorage('tasks', this.appState.tasks)) {
            this.renderTasks();
            this.updateNotifications();
        }
    }

    editTask(id) {
        const task = this.appState.tasks.find(task => task.id === id);
        if (!task) return;

        document.getElementById('editModalLabel').innerHTML = `
            <i class="bi bi-pencil-square me-2" aria-hidden="true"></i>
            تعديل المهمة
        `;
        
        document.getElementById('editModalBody').innerHTML = `
            <div class="mb-3">
                <label for="editTaskInput" class="form-label">نص المهمة</label>
                <input type="text" class="form-control" id="editTaskInput" 
                       value="${this.appState.escapeHtml(task.text)}" maxlength="200" required>
                <div class="invalid-feedback">الرجاء إدخال مهمة صحيحة (1-200 حرف).</div>
            </div>
        `;

        const saveEdit = document.getElementById('saveEdit');
        saveEdit.onclick = () => {
            const editInput = document.getElementById('editTaskInput');
            
            if (!Validator.validateInput(editInput, { maxLength: 200 })) {
                editInput.focus();
                return;
            }

            this.appState.tasks = this.appState.tasks.map(task => 
                task.id === id ? { ...task, text: editInput.value.trim() } : task
            );
            
            if (this.appState.saveToStorage('tasks', this.appState.tasks)) {
                this.renderTasks();
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                this.appState.showToast('تم تعديل المهمة بنجاح.');
            }
        };

        new bootstrap.Modal(document.getElementById('editModal')).show();
        
        // Focus on input after modal is shown
        document.getElementById('editModal').addEventListener('shown.bs.modal', () => {
            document.getElementById('editTaskInput').focus();
        }, { once: true });
    }

    deleteTask(id) {
        this.showDeleteConfirmation(() => {
            this.appState.tasks = this.appState.tasks.filter(task => task.id !== id);
            
            if (this.appState.saveToStorage('tasks', this.appState.tasks)) {
                this.renderTasks();
                this.appState.showToast('تم حذف المهمة بنجاح.', 'danger');
                this.updateNotifications();
            }
        });
    }

    showDeleteConfirmation(callback) {
        document.getElementById('confirmModalBody').textContent = 
            'هل أنت متأكد من أنك تريد حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.';
        
        const confirmDelete = document.getElementById('confirmDelete');
        confirmDelete.onclick = () => {
            callback();
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
        };

        new bootstrap.Modal(document.getElementById('confirmModal')).show();
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        
        if (this.appState.tasks.length === 0) {
            taskList.innerHTML = `
                <li class="list-group-item text-center text-muted">
                    <i class="bi bi-inbox me-2" aria-hidden="true"></i>
                    لا توجد مهام حالياً
                </li>
            `;
            return;
        }

        taskList.innerHTML = this.appState.tasks.map(task => `
            <li class="list-group-item d-flex justify-content-between align-items-center fade-in" 
                role="listitem">
                <div class="d-flex align-items-center">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="taskManager.toggleTask(${task.id})"
                           aria-label="تبديل حالة المهمة">
                    <span class="${task.completed ? 'text-decoration-line-through' : ''} me-2">
                        ${this.appState.escapeHtml(task.text)}
                    </span>
                </div>
                <div class="btn-group" role="group" aria-label="إجراءات المهمة">
                    <button class="btn btn-sm btn-primary" 
                            onclick="taskManager.editTask(${task.id})"
                            aria-label="تعديل المهمة">
                        <i class="bi bi-pencil" aria-hidden="true"></i>
                        <span class="d-none d-md-inline">تعديل</span>
                    </button>
                    <button class="btn btn-sm btn-danger" 
                            onclick="taskManager.deleteTask(${task.id})"
                            aria-label="حذف المهمة">
                        <i class="bi bi-trash" aria-hidden="true"></i>
                        <span class="d-none d-md-inline">حذف</span>
                    </button>
                </div>
            </li>
        `).join('');
    }

    updateNotifications() {
        const incompleteTasks = this.appState.tasks.filter(task => !task.completed);
        const notificationsDiv = document.getElementById('notifications');
        
        if (incompleteTasks.length > 0) {
            const message = `المهام غير المنجزة (${incompleteTasks.length}):\n${incompleteTasks.map(task => `• ${task.text}`).join('\n')}`;
            notificationsDiv.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
                <strong>تذكير:</strong> لديك ${incompleteTasks.length} مهمة غير منجزة
            `;
            notificationsDiv.classList.remove('d-none');
            
            // Log for WhatsApp integration
            console.log('WhatsApp notification:', message);
        } else {
            notificationsDiv.classList.add('d-none');
        }
    }
}

// Note Management
class NoteManager {
    constructor(appState) {
        this.appState = appState;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const noteForm = document.getElementById('noteForm');
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNote();
        });
    }

    addNote() {
        const noteInput = document.getElementById('noteInput');
        
        if (!Validator.validateInput(noteInput, { maxLength: 1000 })) {
            noteInput.focus();
            return;
        }

        const note = {
            id: Date.now(),
            text: noteInput.value.trim(),
            createdAt: new Date().toISOString()
        };

        this.appState.notes.push(note);
        
        if (this.appState.saveToStorage('notes', this.appState.notes)) {
            this.renderNotes();
            noteInput.value = '';
            noteInput.classList.remove('is-invalid');
            this.appState.showToast('تم إضافة الملاحظة بنجاح.');
        }
    }

    editNote(id) {
        const note = this.appState.notes.find(note => note.id === id);
        if (!note) return;

        document.getElementById('editModalLabel').innerHTML = `
            <i class="bi bi-pencil-square me-2" aria-hidden="true"></i>
            تعديل الملاحظة
        `;
        
        document.getElementById('editModalBody').innerHTML = `
            <div class="mb-3">
                <label for="editNoteInput" class="form-label">نص الملاحظة</label>
                <textarea class="form-control" id="editNoteInput" rows="4" 
                          maxlength="1000" required>${this.appState.escapeHtml(note.text)}</textarea>
                <div class="invalid-feedback">الرجاء إدخال ملاحظة صحيحة (1-1000 حرف).</div>
            </div>
        `;

        const saveEdit = document.getElementById('saveEdit');
        saveEdit.onclick = () => {
            const editInput = document.getElementById('editNoteInput');
            
            if (!Validator.validateInput(editInput, { maxLength: 1000 })) {
                editInput.focus();
                return;
            }

            this.appState.notes = this.appState.notes.map(note => 
                note.id === id ? { ...note, text: editInput.value.trim() } : note
            );
            
            if (this.appState.saveToStorage('notes', this.appState.notes)) {
                this.renderNotes();
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                this.appState.showToast('تم تعديل الملاحظة بنجاح.');
            }
        };

        new bootstrap.Modal(document.getElementById('editModal')).show();
        
        // Focus on textarea after modal is shown
        document.getElementById('editModal').addEventListener('shown.bs.modal', () => {
            document.getElementById('editNoteInput').focus();
        }, { once: true });
    }

    deleteNote(id) {
        this.showDeleteConfirmation(() => {
            this.appState.notes = this.appState.notes.filter(note => note.id !== id);
            
            if (this.appState.saveToStorage('notes', this.appState.notes)) {
                this.renderNotes();
                this.appState.showToast('تم حذف الملاحظة بنجاح.', 'danger');
            }
        });
    }

    showDeleteConfirmation(callback) {
        document.getElementById('confirmModalBody').textContent = 
            'هل أنت متأكد من أنك تريد حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء.';
        
        const confirmDelete = document.getElementById('confirmDelete');
        confirmDelete.onclick = () => {
            callback();
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
        };

        new bootstrap.Modal(document.getElementById('confirmModal')).show();
    }

    renderNotes() {
        const noteList = document.getElementById('noteList');
        
        if (this.appState.notes.length === 0) {
            noteList.innerHTML = `
                <li class="list-group-item text-center text-muted">
                    <i class="bi bi-journal me-2" aria-hidden="true"></i>
                    لا توجد ملاحظات حالياً
                </li>
            `;
            return;
        }

        noteList.innerHTML = this.appState.notes.map(note => `
            <li class="list-group-item d-flex justify-content-between align-items-start fade-in" 
                role="listitem">
                <div class="flex-grow-1">
                    <p class="mb-1">${this.appState.escapeHtml(note.text).replace(/\n/g, '<br>')}</p>
                    <small class="text-muted">
                        <i class="bi bi-clock me-1" aria-hidden="true"></i>
                        ${new Date(note.createdAt).toLocaleString('ar-SA')}
                    </small>
                </div>
                <div class="btn-group ms-2" role="group" aria-label="إجراءات الملاحظة">
                    <button class="btn btn-sm btn-primary" 
                            onclick="noteManager.editNote(${note.id})"
                            aria-label="تعديل الملاحظة">
                        <i class="bi bi-pencil" aria-hidden="true"></i>
                        <span class="d-none d-md-inline">تعديل</span>
                    </button>
                    <button class="btn btn-sm btn-danger" 
                            onclick="noteManager.deleteNote(${note.id})"
                            aria-label="حذف الملاحظة">
                        <i class="bi bi-trash" aria-hidden="true"></i>
                        <span class="d-none d-md-inline">حذف</span>
                    </button>
                </div>
            </li>
        `).join('');
    }
}

// Transaction Management
class TransactionManager {
    constructor(appState) {
        this.appState = appState;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const transactionForm = document.getElementById('transactionForm');
        transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });
    }

    addTransaction() {
        const transDate = document.getElementById('transDate');
        const transOperation = document.getElementById('transOperation');
        const transPay = document.getElementById('transPay');
        const transReceive = document.getElementById('transReceive');
        
        const isDateValid = Validator.validateDate(transDate, true);
        const isOperationValid = Validator.validateInput(transOperation, { maxLength: 100 });
        const isPayValid = Validator.validateNumber(transPay, { min: 0 });
        const isReceiveValid = Validator.validateNumber(transReceive, { min: 0 });
        
        if (!isDateValid || !isOperationValid || !isPayValid || !isReceiveValid) {
            if (!isDateValid) transDate.focus();
            else if (!isOperationValid) transOperation.focus();
            else if (!isPayValid) transPay.focus();
            else if (!isReceiveValid) transReceive.focus();
            return;
        }

        const transaction = {
            id: Date.now(),
            date: transDate.value,
            operation: transOperation.value.trim(),
            pay: transPay.value ? parseFloat(transPay.value) : 0,
            receive: transReceive.value ? parseFloat(transReceive.value) : 0,
            call: document.getElementById('transCall').value.trim(),
            contact: document.getElementById('transContact').value.trim(),
            other: document.getElementById('transOther').value.trim(),
            createdAt: new Date().toISOString()
        };

        this.appState.transactions.push(transaction);
        
        if (this.appState.saveToStorage('transactions', this.appState.transactions)) {
            this.renderTransactions();
            this.clearTransactionInputs();
            this.appState.showToast('تم إضافة العملية بنجاح.');
        }
    }

    editTransaction(id) {
        const transaction = this.appState.transactions.find(t => t.id === id);
        if (!transaction) return;

        document.getElementById('editModalLabel').innerHTML = `
            <i class="bi bi-pencil-square me-2" aria-hidden="true"></i>
            تعديل العملية
        `;
        
        document.getElementById('editModalBody').innerHTML = `
            <div class="row g-3">
                <div class="col-md-6">
                    <label for="editTransDate" class="form-label">التاريخ *</label>
                    <input type="date" class="form-control" id="editTransDate" 
                           value="${transaction.date}" required>
                    <div class="invalid-feedback">الرجاء إدخال تاريخ صحيح.</div>
                </div>
                <div class="col-md-6">
                    <label for="editTransOperation" class="form-label">العملية *</label>
                    <input type="text" class="form-control" id="editTransOperation" 
                           value="${this.appState.escapeHtml(transaction.operation)}" 
                           maxlength="100" required>
                    <div class="invalid-feedback">الرجاء إدخال وصف العملية (1-100 حرف).</div>
                </div>
                <div class="col-md-6">
                    <label for="editTransPay" class="form-label">دفع</label>
                    <input type="number" class="form-control" id="editTransPay" 
                           value="${transaction.pay || ''}" min="0" step="0.01">
                </div>
                <div class="col-md-6">
                    <label for="editTransReceive" class="form-label">قبض</label>
                    <input type="number" class="form-control" id="editTransReceive" 
                           value="${transaction.receive || ''}" min="0" step="0.01">
                </div>
                <div class="col-md-4">
                    <label for="editTransCall" class="form-label">مكالمة</label>
                    <input type="text" class="form-control" id="editTransCall" 
                           value="${this.appState.escapeHtml(transaction.call)}" maxlength="100">
                </div>
                <div class="col-md-4">
                    <label for="editTransContact" class="form-label">اتصال</label>
                    <input type="text" class="form-control" id="editTransContact" 
                           value="${this.appState.escapeHtml(transaction.contact)}" maxlength="100">
                </div>
                <div class="col-md-4">
                    <label for="editTransOther" class="form-label">أخرى</label>
                    <input type="text" class="form-control" id="editTransOther" 
                           value="${this.appState.escapeHtml(transaction.other)}" maxlength="100">
                </div>
            </div>
        `;

        const saveEdit = document.getElementById('saveEdit');
        saveEdit.onclick = () => {
            const dateInput = document.getElementById('editTransDate');
            const operationInput = document.getElementById('editTransOperation');
            const payInput = document.getElementById('editTransPay');
            const receiveInput = document.getElementById('editTransReceive');
            
            const isDateValid = Validator.validateDate(dateInput, true);
            const isOperationValid = Validator.validateInput(operationInput, { maxLength: 100 });
            const isPayValid = Validator.validateNumber(payInput, { min: 0 });
            const isReceiveValid = Validator.validateNumber(receiveInput, { min: 0 });
            
            if (!isDateValid || !isOperationValid || !isPayValid || !isReceiveValid) {
                if (!isDateValid) dateInput.focus();
                else if (!isOperationValid) operationInput.focus();
                else if (!isPayValid) payInput.focus();
                else if (!isReceiveValid) receiveInput.focus();
                return;
            }

            this.appState.transactions = this.appState.transactions.map(t => 
                t.id === id ? {
                    ...t,
                    date: dateInput.value,
                    operation: operationInput.value.trim(),
                    pay: payInput.value ? parseFloat(payInput.value) : 0,
                    receive: receiveInput.value ? parseFloat(receiveInput.value) : 0,
                    call: document.getElementById('editTransCall').value.trim(),
                    contact: document.getElementById('editTransContact').value.trim(),
                    other: document.getElementById('editTransOther').value.trim()
                } : t
            );
            
            if (this.appState.saveToStorage('transactions', this.appState.transactions)) {
                this.renderTransactions();
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                this.appState.showToast('تم تعديل العملية بنجاح.');
            }
        };

        new bootstrap.Modal(document.getElementById('editModal')).show();
        
        // Focus on first input after modal is shown
        document.getElementById('editModal').addEventListener('shown.bs.modal', () => {
            document.getElementById('editTransDate').focus();
        }, { once: true });
    }

    deleteTransaction(id) {
        this.showDeleteConfirmation(() => {
            this.appState.transactions = this.appState.transactions.filter(t => t.id !== id);
            
            if (this.appState.saveToStorage('transactions', this.appState.transactions)) {
                this.renderTransactions();
                this.appState.showToast('تم حذف العملية بنجاح.', 'danger');
            }
        });
    }

    showDeleteConfirmation(callback) {
        document.getElementById('confirmModalBody').textContent = 
            'هل أنت متأكد من أنك تريد حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.';
        
        const confirmDelete = document.getElementById('confirmDelete');
        confirmDelete.onclick = () => {
            callback();
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
        };

        new bootstrap.Modal(document.getElementById('confirmModal')).show();
    }

    renderTransactions() {
        const transactionBody = document.getElementById('transactionBody');
        
        if (this.appState.transactions.length === 0) {
            transactionBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="bi bi-inbox me-2" aria-hidden="true"></i>
                        لا توجد عمليات حالياً
                    </td>
                </tr>
            `;
            return;
        }

        transactionBody.innerHTML = this.appState.transactions.map(trans => `
            <tr class="fade-in">
                <td>${trans.date}</td>
                <td>${this.appState.escapeHtml(trans.operation)}</td>
                <td class="text-end">${trans.pay ? trans.pay.toLocaleString('ar-SA') : '-'}</td>
                <td class="text-end">${trans.receive ? trans.receive.toLocaleString('ar-SA') : '-'}</td>
                <td>${this.appState.escapeHtml(trans.call) || '-'}</td>
                <td>${this.appState.escapeHtml(trans.contact) || '-'}</td>
                <td>${this.appState.escapeHtml(trans.other) || '-'}</td>
                <td>
                    <div class="btn-group" role="group" aria-label="إجراءات العملية">
                        <button class="btn btn-sm btn-primary" 
                                onclick="transactionManager.editTransaction(${trans.id})"
                                aria-label="تعديل العملية">
                            <i class="bi bi-pencil" aria-hidden="true"></i>
                            <span class="d-none d-lg-inline">تعديل</span>
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="transactionManager.deleteTransaction(${trans.id})"
                                aria-label="حذف العملية">
                            <i class="bi bi-trash" aria-hidden="true"></i>
                            <span class="d-none d-lg-inline">حذف</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    clearTransactionInputs() {
        const inputs = ['transDate', 'transOperation', 'transPay', 'transReceive', 'transCall', 'transContact', 'transOther'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            input.value = '';
            input.classList.remove('is-invalid');
        });
    }
}

// Trader Management
class TraderManager {
    constructor(appState) {
        this.appState = appState;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const traderForm = document.getElementById('traderForm');
        traderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTrader();
        });
    }

    addTrader() {
        const traderName = document.getElementById('traderName');
        const traderAmount = document.getElementById('traderAmount');
        
        const isNameValid = Validator.validateInput(traderName, { maxLength: 50 });
        const isAmountValid = Validator.validateNumber(traderAmount, { min: 0, required: true });
        
        if (!isNameValid || !isAmountValid) {
            if (!isNameValid) traderName.focus();
            else if (!isAmountValid) traderAmount.focus();
            return;
        }

        const trader = {
            id: Date.now(),
            name: traderName.value.trim(),
            amount: parseFloat(traderAmount.value),
            createdAt: new Date().toISOString()
        };

        this.appState.traders.push(trader);
        
        if (this.appState.saveToStorage('traders', this.appState.traders)) {
            this.renderTraders();
            traderName.value = '';
            traderAmount.value = '';
            traderName.classList.remove('is-invalid');
            traderAmount.classList.remove('is-invalid');
            this.appState.showToast('تم إضافة التاجر بنجاح.');
        }
    }

    editTrader(id) {
        const trader = this.appState.traders.find(t => t.id === id);
        if (!trader) return;

        document.getElementById('editModalLabel').innerHTML = `
            <i class="bi bi-pencil-square me-2" aria-hidden="true"></i>
            تعديل التاجر
        `;
        
        document.getElementById('editModalBody').innerHTML = `
            <div class="row g-3">
                <div class="col-md-6">
                    <label for="editTraderName" class="form-label">اسم التاجر *</label>
                    <input type="text" class="form-control" id="editTraderName" 
                           value="${this.appState.escapeHtml(trader.name)}" 
                           maxlength="50" required>
                    <div class="invalid-feedback">الرجاء إدخال اسم التاجر (1-50 حرف).</div>
                </div>
                <div class="col-md-6">
                    <label for="editTraderAmount" class="form-label">المبلغ *</label>
                    <input type="number" class="form-control" id="editTraderAmount" 
                           value="${trader.amount}" min="0" step="0.01" required>
                    <div class="invalid-feedback">الرجاء إدخال مبلغ صحيح.</div>
                </div>
            </div>
        `;

        const saveEdit = document.getElementById('saveEdit');
        saveEdit.onclick = () => {
            const nameInput = document.getElementById('editTraderName');
            const amountInput = document.getElementById('editTraderAmount');
            
            const isNameValid = Validator.validateInput(nameInput, { maxLength: 50 });
            const isAmountValid = Validator.validateNumber(amountInput, { min: 0, required: true });
            
            if (!isNameValid || !isAmountValid) {
                if (!isNameValid) nameInput.focus();
                else if (!isAmountValid) amountInput.focus();
                return;
            }

            this.appState.traders = this.appState.traders.map(t => 
                t.id === id ? { 
                    ...t, 
                    name: nameInput.value.trim(), 
                    amount: parseFloat(amountInput.value) 
                } : t
            );
            
            if (this.appState.saveToStorage('traders', this.appState.traders)) {
                this.renderTraders();
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                this.appState.showToast('تم تعديل التاجر بنجاح.');
            }
        };

        new bootstrap.Modal(document.getElementById('editModal')).show();
        
        // Focus on first input after modal is shown
        document.getElementById('editModal').addEventListener('shown.bs.modal', () => {
            document.getElementById('editTraderName').focus();
        }, { once: true });
    }

    deleteTrader(id) {
        this.showDeleteConfirmation(() => {
            this.appState.traders = this.appState.traders.filter(t => t.id !== id);
            
            if (this.appState.saveToStorage('traders', this.appState.traders)) {
                this.renderTraders();
                this.appState.showToast('تم حذف التاجر بنجاح.', 'danger');
            }
        });
    }

    showDeleteConfirmation(callback) {
        document.getElementById('confirmModalBody').textContent = 
            'هل أنت متأكد من أنك تريد حذف هذا التاجر؟ لا يمكن التراجع عن هذا الإجراء.';
        
        const confirmDelete = document.getElementById('confirmDelete');
        confirmDelete.onclick = () => {
            callback();
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
        };

        new bootstrap.Modal(document.getElementById('confirmModal')).show();
    }

    renderTraders() {
        const traderTables = document.getElementById('traderTables');
        
        if (this.appState.traders.length === 0) {
            traderTables.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="bi bi-people me-2" aria-hidden="true"></i>
                    لا يوجد تجار حالياً
                </div>
            `;
            return;
        }

        traderTables.innerHTML = this.appState.traders.map(trader => `
            <div class="card mb-3 fade-in">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered mb-0">
                            <thead class="table-success">
                                <tr>
                                    <th scope="col">اسم التاجر</th>
                                    <th scope="col">المبلغ</th>
                                    <th scope="col">تاريخ الإضافة</th>
                                    <th scope="col">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${this.appState.escapeHtml(trader.name)}</td>
                                    <td class="text-end">${trader.amount.toLocaleString('ar-SA')}</td>
                                    <td>${new Date(trader.createdAt).toLocaleDateString('ar-SA')}</td>
                                    <td>
                                        <div class="btn-group" role="group" aria-label="إجراءات التاجر">
                                            <button class="btn btn-sm btn-primary" 
                                                    onclick="traderManager.editTrader(${trader.id})"
                                                    aria-label="تعديل التاجر">
                                                <i class="bi bi-pencil" aria-hidden="true"></i>
                                                <span class="d-none d-md-inline">تعديل</span>
                                            </button>
                                            <button class="btn btn-sm btn-danger" 
                                                    onclick="traderManager.deleteTrader(${trader.id})"
                                                    aria-label="حذف التاجر">
                                                <i class="bi bi-trash" aria-hidden="true"></i>
                                                <span class="d-none d-md-inline">حذف</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// WhatsApp Notification Service
class WhatsAppService {
    constructor(appState) {
        this.appState = appState;
        this.setupPeriodicNotifications();
    }

    setupPeriodicNotifications() {
        // Check for incomplete tasks every hour
        setInterval(() => {
            this.sendTaskReminder();
        }, 3600000); // 1 hour = 3600000 ms
    }

    sendTaskReminder() {
        const incompleteTasks = this.appState.tasks.filter(task => !task.completed);
        
        if (incompleteTasks.length > 0) {
            const message = `تذكير: لديك ${incompleteTasks.length} مهمة غير منجزة:\n${incompleteTasks.map(task => `• ${task.text}`).join('\n')}`;
            
            console.log('WhatsApp notification:', message);
            
            // Here you would integrate with WhatsApp API (e.g., Twilio)
            // Example implementation:
            /*
            fetch('/api/send-whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: '+963992223739',
                    message: message
                })
            }).then(response => {
                if (response.ok) {
                    console.log('WhatsApp message sent successfully');
                } else {
                    console.error('Failed to send WhatsApp message');
                }
            }).catch(error => {
                console.error('Error sending WhatsApp message:', error);
            });
            */
        }
    }
}

// Application Initialization
let appState, taskManager, noteManager, transactionManager, traderManager, whatsAppService;

document.addEventListener('DOMContentLoaded', function() {
    // Show loading spinner
    document.getElementById('loadingSpinner').classList.add('show');
    
    // Initialize application
    setTimeout(() => {
        try {
            appState = new AppState();
            taskManager = new TaskManager(appState);
            noteManager = new NoteManager(appState);
            transactionManager = new TransactionManager(appState);
            traderManager = new TraderManager(appState);
            whatsAppService = new WhatsAppService(appState);

            // Initial rendering
            taskManager.renderTasks();
            noteManager.renderNotes();
            transactionManager.renderTransactions();
            traderManager.renderTraders();
            taskManager.updateNotifications();

            // Hide loading spinner
            appState.hideLoading();
            
            // Show welcome message
            appState.showToast('مرحباً بك في مذكرة الكوتش!', 'info');
            
        } catch (error) {
            console.error('Error initializing application:', error);
            document.getElementById('loadingSpinner').classList.remove('show');
            
            // Show error message
            const errorToast = document.createElement('div');
            errorToast.className = 'toast align-items-center text-white bg-danger border-0';
            errorToast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">حدث خطأ في تحميل التطبيق. يرجى إعادة تحميل الصفحة.</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>`;
            document.querySelector('.toast-container').appendChild(errorToast);
            new bootstrap.Toast(errorToast).show();
        }
    }, 500); // Small delay to show loading spinner
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        const form = activeElement.closest('form');
        if (form) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            bootstrap.Modal.getInstance(openModal).hide();
        }
    }
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}

