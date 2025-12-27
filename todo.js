console.log("Final project loaded");

// Footer year
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// DOM elements
const form = document.getElementById("todoForm");
const input = document.getElementById("taskInput");
const list = document.getElementById("taskList");
const clearBtn = document.getElementById("clearAll");

// Load tasks from localStorage
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Show tasks
function showTasks() {
  list.innerHTML = "";
  tasks.forEach(t => {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = t.text;
    span.className = t.done ? "task-text done" : "task-text";

    const btns = document.createElement("div");
    btns.className = "task-buttons";

    const doneBtn = document.createElement("button");
    doneBtn.textContent = t.done ? "Undo" : "Done";
    doneBtn.className = "done-btn";
    doneBtn.onclick = () => toggleDone(t.id);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "delete-btn";
    delBtn.onclick = () => deleteTask(t.id);

    btns.appendChild(doneBtn);
    btns.appendChild(delBtn);
    li.appendChild(span);
    li.appendChild(btns);
    list.appendChild(li);
  });
}

showTasks();

// Add task
if (form) {
  form.addEventListener("submit", e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return alert("Write something first");

    tasks.push({
      id: Date.now(),
      text: text,
      done: false
    });

    input.value = "";
    save();
  });
}

// Toggle done
function toggleDone(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  save();
}

// Delete task
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
}

// Clear all
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (tasks.length === 0) return;
    if (!confirm("Clear all tasks?")) return;
    tasks = [];
    save();
  });
}

// Save + refresh
function save() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  showTasks();
}
