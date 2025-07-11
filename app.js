document.addEventListener('DOMContentLoaded', function () {
    const taskInput = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('dueDateInput');
    const addTaskButton = document.getElementById('addTaskButton');
    const taskList = document.getElementById('taskList');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    const pagination = document.getElementById('pagination');
    const csvFileInput = document.getElementById('csvFileInput');
    const uploadCsvButton = document.getElementById('uploadCsvButton');
    const csvDataContainer = document.getElementById('csv-data');

    const tasksPerPage = 5;
    let currentPage = 1;
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Toast container
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0 show`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const searchQuery = searchInput.value.toLowerCase();
        const filterStatus = filterSelect.value;

        let filteredTasks = tasks.filter(task => task.text && task.text.toLowerCase().includes(searchQuery));
        if (filterStatus === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (filterStatus === 'not_completed') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }

        const totalPages = Math.ceil(filteredTasks.length / tasksPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIdx = (currentPage - 1) * tasksPerPage;
        const endIdx = startIdx + tasksPerPage;
        const paginatedTasks = filteredTasks.slice(startIdx, endIdx);

        paginatedTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `list-group-item d-flex justify-content-between align-items-center ${task.completed ? 'completed' : ''}`;
            
            const span = document.createElement('span');
            span.textContent = task.text;
            if (task.dueDate) {
                const due = document.createElement('small');
                due.className = 'text-muted ms-2';
                due.textContent = `(Due: ${task.dueDate})`;
                span.appendChild(due);
            }
            
            const btnGroup = document.createElement('div');
            const completeBtn = document.createElement('button');
            completeBtn.className = 'btn btn-success btn-sm';
            completeBtn.textContent = task.completed ? 'Undo' : 'Complete';
            completeBtn.onclick = () => {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm ms-2';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => {
                tasks = tasks.filter(t => t !== task);
                saveTasks();
                renderTasks();
            };

            btnGroup.appendChild(completeBtn);
            btnGroup.appendChild(deleteBtn);
            li.appendChild(span);
            li.appendChild(btnGroup);
            taskList.appendChild(li);
        });

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        pagination.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'} me-1`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                renderTasks();
            };
            pagination.appendChild(pageBtn);
        }
    }

    addTaskButton.addEventListener('click', () => {
        const text = taskInput.value.trim();
        const dueDate = dueDateInput.value;
        if (text) {
            tasks.unshift({ text, dueDate, completed: false });
            saveTasks();
            taskInput.value = '';
            dueDateInput.value = '';
            renderTasks();
        }
    });

    searchInput.addEventListener('input', () => { currentPage = 1; renderTasks(); });
    filterSelect.addEventListener('change', () => { currentPage = 1; renderTasks(); });

    // Export functionality
    document.getElementById('exportJson').addEventListener('click', () => exportTasks('json'));
    document.getElementById('exportTxt').addEventListener('click', () => exportTasks('txt'));
    document.getElementById('exportSql').addEventListener('click', () => exportTasks('sql'));
    document.getElementById('exportCsv').addEventListener('click', () => exportTasks('csv'));

    function exportTasks(type) {
        let dataStr, filename, mimeType;
        const exportedTasks = tasks.map(t => ({ text: t.text, dueDate: t.dueDate, completed: t.completed }));

        switch (type) {
            case 'json':
                dataStr = JSON.stringify(exportedTasks, null, 2);
                filename = 'tasks.json';
                mimeType = 'application/json';
                break;
            case 'txt':
                dataStr = exportedTasks.map(t => `${t.text}${t.dueDate ? ' (Due: ' + t.dueDate + ')' : ''} [${t.completed ? 'Completed' : 'Incomplete'}]`).join('\n');
                filename = 'tasks.txt';
                mimeType = 'text/plain';
                break;
            case 'sql':
                dataStr = 'INSERT INTO tasks (text, due_date, completed) VALUES\n' +
                    exportedTasks.map(t => `('${t.text.replace(/'/g, "''")}', ${t.dueDate ? `'${t.dueDate}'` : 'NULL'}, ${t.completed})`).join(',\n') + ';';
                filename = 'tasks.sql';
                mimeType = 'application/sql';
                break;
            case 'csv':
                dataStr = 'Task,DueDate,Completed\n' + exportedTasks.map(t => `"${t.text.replace(/"/g, '""')}","${t.dueDate || ''}",${t.completed}`).join('\n');
                filename = 'tasks.csv';
                mimeType = 'text/csv';
                break;
        }

        const blob = new Blob([dataStr], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // CSV Import
    uploadCsvButton.addEventListener('click', () => {
        const file = csvFileInput.files[0];
        if (!file) {
            showToast('Please select a CSV file.', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csvData = event.target.result;
                const parsed = parseCSV(csvData);
                if (parsed.length > 0) {
                    tasks = parsed.map(row => ({ text: row[0], dueDate: row[1], completed: row[2] ? row[2].toLowerCase() === 'true' : false })).concat(tasks);
                    saveTasks();
                    renderTasks();
                    showToast('CSV data imported successfully!', 'success');
                } else {
                    showToast('CSV file is empty or invalid.', 'warning');
                }
            } catch (e) {
                showToast('Error parsing CSV: ' + e.message, 'danger');
            }
        };
        reader.readAsText(file);
    });

    function parseCSV(data) {
        const rows = data.trim().split('\n');
        return rows.slice(1).map(row => row.split(','));
    }

    renderTasks();
});