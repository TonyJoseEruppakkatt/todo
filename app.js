document.addEventListener('DOMContentLoaded', function () {
    const taskInput = document.getElementById('taskInput');
    const addTaskButton = document.getElementById('addTaskButton');
    const taskList = document.getElementById('taskList');
    const tasksPerPage = 5;
    let currentPage = 1;
    // Export dropdown button

    // Toast container
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0 show`;
        toast.role = 'alert';
        toast.ariaLive = 'assertive';
        toast.ariaAtomic = 'true';
        toast.style.minWidth = '200px';
        toast.style.marginBottom = '10px';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        toastContainer.appendChild(toast);

        // Remove toast after 2 seconds or on close
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('fade');
            setTimeout(() => toast.remove(), 500);
        }, 2000);

        toast.querySelector('.btn-close').onclick = () => toast.remove();
    }

    // Animation helpers
    function animateAdd(li) {
        li.style.animation = 'fadeIn 0.5s';
        li.addEventListener('animationend', () => {
            li.style.animation = '';
        }, { once: true });
    }
    function animateDelete(li, callback) {
        li.style.animation = 'fadeOut 0.5s';
        li.addEventListener('animationend', () => {
            callback();
        }, { once: true });
    }

    // Add CSS for fadeIn/fadeOut
    const style = document.createElement('style');
    style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95);}
        to { opacity: 1; transform: scale(1);}
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1);}
        to { opacity: 0; transform: scale(0.95);}
    }
    `;
    document.head.appendChild(style);
    // Make sure Bootstrap JS and Popper.js are included in your HTML for dropdowns to work
    const exportDropdownDiv = document.createElement('div');
    exportDropdownDiv.className = 'dropdown mb-2 ml-2';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary btn-sm dropdown-toggle';
    exportBtn.type = 'button';
    exportBtn.id = 'exportDropdown';
    exportBtn.setAttribute('data-bs-toggle', 'dropdown');
    exportBtn.setAttribute('aria-haspopup', 'true');
    exportBtn.setAttribute('aria-expanded', 'false');
    exportBtn.textContent = 'Export';

    const exportMenu = document.createElement('div');
    exportMenu.className = 'dropdown-menu';
    exportMenu.setAttribute('aria-labelledby', 'exportDropdown');

    const formats = [
        { label: 'Export as JSON', type: 'json' },
        { label: 'Export as Raw Text', type: 'txt' },
        { label: 'Export as SQL', type: 'sql' },
        { label: 'Export as CSV', type: 'csv' }
    ];

    formats.forEach(fmt => {
        const item = document.createElement('a');
        item.className = 'dropdown-item';
        item.href = '#';
        item.textContent = fmt.label;
        item.addEventListener('click', function (e) {
            e.preventDefault();
            exportTasks(fmt.type);
        });
        exportMenu.appendChild(item);
    });

    exportDropdownDiv.appendChild(exportBtn);
    exportDropdownDiv.appendChild(exportMenu);

    // Add search box
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'form-control form-control-sm mb-2';
    searchInput.placeholder = 'Search tasks...';
    taskList.parentNode.insertBefore(searchInput, taskList);

    // Insert export dropdown before the search input
    taskList.parentNode.insertBefore(exportDropdownDiv, searchInput);

    function exportTasks(type) {
        let dataStr = '';
        let filename = 'tasks';
        if (type === 'json') {
            dataStr = JSON.stringify(tasks, null, 2);
            filename += '.json';
        } else if (type === 'txt') {
            dataStr = tasks.map(t => `${t.text}${t.dueDate ? ' (Due: ' + t.dueDate + ')' : ''}${t.completed ? ' [Completed]' : ''}`).join('\n');
            filename += '.txt';
        } else if (type === 'csv') {
            dataStr = 'Task,Completed,Due Date\n' + tasks.map(t =>
                `"${t.text.replace(/"/g, '""')}",${t.completed ? 'Yes' : 'No'},"${t.dueDate || ''}"`
            ).join('\n');
            filename += '.csv';
        } else if (type === 'sql') {
            dataStr = 'INSERT INTO tasks (text, completed, due_date) VALUES\n' +
                tasks.map(t =>
                    `('${t.text.replace(/'/g, "''")}', ${t.completed ? 1 : 0}, ${t.dueDate ? `'${t.dueDate}'` : 'NULL'})`
                ).join(',\n') + ';';
            filename += '.sql';
        }
        const blob = new Blob([dataStr], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Add filter dropdown for completed/not completed
    const filterSelect = document.createElement('select');
    filterSelect.className = 'form-control form-control-sm mb-2 ml-2';
    filterSelect.style.width = 'auto';
    filterSelect.innerHTML = `
        <option value="all">All Tasks</option>
        <option value="completed">Completed</option>
        <option value="not_completed">Not Completed</option>
    `;
    searchInput.parentNode.insertBefore(filterSelect, searchInput.nextSibling);

    let filterStatus = 'all';
    let searchQuery = '';

    searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim().toLowerCase();
        currentPage = 1;
        renderTasks();
    });

    filterSelect.addEventListener('change', function () {
        filterStatus = filterSelect.value;
        currentPage = 1;
        renderTasks();
    });

    // Add due date input
    const dueDateInput = document.createElement('input');
    dueDateInput.type = 'date';
    dueDateInput.className = 'form-control form-control-sm ml-2';
    dueDateInput.id = 'dueDateInput';
    addTaskButton.parentNode.insertBefore(dueDateInput, addTaskButton);

    // Create pagination container
    const pagination = document.createElement('nav');
    pagination.className = 'mt-3';
    taskList.parentNode.appendChild(pagination);

    // Load tasks from localStorage
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    renderTasks();

    // Error message element
    let errorMsg = document.createElement('div');
    errorMsg.className = 'text-danger mt-2';
    errorMsg.style.display = 'none';
    addTaskButton.parentNode.insertBefore(errorMsg, addTaskButton.nextSibling);

    // Add Task
    addTaskButton.addEventListener('click', function () {
        const taskText = taskInput.value.trim();
        const dueDate = dueDateInput.value;
        errorMsg.style.display = 'none';
        if (taskText === '') {
            errorMsg.textContent = 'Task cannot be empty.';
            errorMsg.style.display = 'block';
            return;
        }
        if (!dueDate) {
            errorMsg.textContent = 'Please select a due date.';
            errorMsg.style.display = 'block';
            return;
        }
        tasks.push({ text: taskText, completed: false, dueDate: dueDate });
        saveTasks();
        currentPage = Math.ceil(tasks.length / tasksPerPage) || 1;
        renderTasks();
        taskInput.value = '';
        dueDateInput.value = '';
    });

    // Add task on Enter key
    taskInput.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            addTaskButton.click();
        }
    });

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        taskList.innerHTML = '';
        // Filter tasks based on search query and filter status
        let filteredTasks = tasks.filter(task => task.text.toLowerCase().includes(searchQuery));
        if (filterStatus === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (filterStatus === 'not_completed') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }
        const totalPages = Math.ceil(filteredTasks.length / tasksPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const startIdx = (currentPage - 1) * tasksPerPage;
        const endIdx = Math.min(startIdx + tasksPerPage, filteredTasks.length);

        filteredTasks.slice(startIdx, endIdx).forEach((task, idx) => {
            // Find the real index in the original tasks array
            const realIdx = tasks.indexOf(filteredTasks[startIdx + idx]);
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';

            const span = document.createElement('span');
            span.textContent = task.text;
            if (task.completed) {
                span.style.textDecoration = 'line-through';
            }

            // Show due date if present
            if (task.dueDate) {
                const due = document.createElement('small');
                due.className = 'text-muted ml-2';
                due.textContent = `(Due: ${task.dueDate})`;
                span.appendChild(due);
            }

            // Edit functionality
            span.style.cursor = 'pointer';
            span.title = 'Click to edit';
            span.addEventListener('click', function () {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = task.text;
                input.className = 'form-control form-control-sm';
                input.addEventListener('keyup', function (e) {
                    if (e.key === 'Enter') {
                        finishEdit();
                    }
                });
                input.addEventListener('blur', finishEdit);

                // Due date edit
                const dueInput = document.createElement('input');
                dueInput.type = 'date';
                dueInput.value = task.dueDate || '';
                dueInput.className = 'form-control form-control-sm ml-2';

                const editDiv = document.createElement('div');
                editDiv.className = 'd-flex align-items-center';
                editDiv.appendChild(input);
                editDiv.appendChild(dueInput);

                li.replaceChild(editDiv, span);
                input.focus();

                function finishEdit() {
                    const newText = input.value.trim();
                    const newDue = dueInput.value;
                    if (newText) {
                        tasks[realIdx].text = newText;
                        tasks[realIdx].dueDate = newDue;
                        saveTasks();
                        renderTasks();
                    } else {
                        renderTasks();
                    }
                }
            });

            const btnGroup = document.createElement('div');

            const completeBtn = document.createElement('button');
            completeBtn.className = 'btn btn-success btn-sm mr-2';
            completeBtn.textContent = 'Complete';
            if (task.completed) completeBtn.classList.add('d-none');

            const undoBtn = document.createElement('button');
            undoBtn.className = 'btn btn-warning btn-sm mr-2';
            undoBtn.textContent = 'Undo';
            if (!task.completed) undoBtn.classList.add('d-none');

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.textContent = 'Delete';

            // Complete button event
            completeBtn.addEventListener('click', function () {
                tasks[realIdx].completed = true;
                saveTasks();
                renderTasks();
            });

            // Undo button event
            undoBtn.addEventListener('click', function () {
                tasks[realIdx].completed = false;
                saveTasks();
                renderTasks();
            });

            // Delete button event
            deleteBtn.addEventListener('click', function () {
                if (confirm('Are you sure you want to delete this task?')) {
                    tasks.splice(realIdx, 1);
                    saveTasks();
                    if (startIdx >= tasks.length && currentPage > 1) currentPage--;
                    renderTasks();
                }
            });

            btnGroup.appendChild(completeBtn);
            btnGroup.appendChild(undoBtn);
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

        const ul = document.createElement('ul');
        ul.className = 'pagination justify-content-center';

        // Prev button
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-link';
        prevBtn.textContent = 'Previous';
        prevBtn.onclick = function () {
            if (currentPage > 1) {
                currentPage--;
                renderTasks();
            }
        };
        prevLi.appendChild(prevBtn);
        ul.appendChild(prevLi);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = 'page-item' + (i === currentPage ? ' active' : '');
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-link';
            pageBtn.textContent = i;
            pageBtn.onclick = function () {
                currentPage = i;
                renderTasks();
            };
            pageLi.appendChild(pageBtn);
            ul.appendChild(pageLi);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-link';
        nextBtn.textContent = 'Next';
        nextBtn.onclick = function () {
            if (currentPage < totalPages) {
                currentPage++;
                renderTasks();
            }
        };
        nextLi.appendChild(nextBtn);
        ul.appendChild(nextLi);

        pagination.appendChild(ul);
    }
});