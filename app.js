document.addEventListener('DOMContentLoaded', function () {
    const taskInput = document.getElementById('taskInput');
    const addTaskButton = document.getElementById('addTaskButton');
    const taskList = document.getElementById('taskList');
    const tasksPerPage = 5;
    let currentPage = 1;
    // Add search box
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'form-control form-control-sm mb-2';
    searchInput.placeholder = 'Search tasks...';
    taskList.parentNode.insertBefore(searchInput, taskList);

    let searchQuery = '';

    searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value.trim().toLowerCase();
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

    // Add Task 
    
    // Due date Error message element
    let errorMsg = document.createElement('div');
    errorMsg.className = 'text-danger mt-2';
    errorMsg.style.display = 'none';
    addTaskButton.parentNode.insertBefore(errorMsg, addTaskButton.nextSibling);  

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
        // Go to last page after adding
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

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Render tasks with pagination
    function renderTasks() {
        taskList.innerHTML = '';
        // Filter tasks based on search query
        const filteredTasks = tasks.filter(task => task.text.toLowerCase().includes(searchQuery));
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
                    // If deleting last item on last page, go to previous page
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

        // Render pagination controls
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