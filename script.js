let tasks = []

async function fetchTasks() {
    try {
        const response = await fetch('https://66662354d122c2868e4929e1.mockapi.io/todo/tasks')
        if (!response.ok) {
            errorToast('Oops, hubo un error en traer las tareas')
            throw new Error('Failed to fetch tasks')
        }
        tasks = await response.json()
        renderTasks()
    } catch (error) {
        errorToast(error)
        console.error(error)
    }
}

function errorToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, rgb(255, 95, 109), rgb(255, 195, 113))"
        }
    }).showToast()
}

function successToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)"
        }
    }).showToast();
}

document.addEventListener('DOMContentLoaded', fetchTasks)

function renderTasks() {
    const taskList = document.querySelector('.task-list')
    taskList.innerHTML = ''

    const sortedTasks = tasks.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))

    sortedTasks.forEach(task => {
        const taskItem = document.createElement('div')
        taskItem.id = `task-${task.id}`
        taskItem.className = `task-item ${task.status == 'finalizada' ? 'completed' : ''}`

        const taskContent = document.createElement('div')
        taskContent.dataset.taskId = task.id
        taskContent.className = 'task-container'
        taskContent.innerHTML = `
            <h2>${task.name}</h2>
            <p>${task.createdDate}</p>
        `

        const taskButton = document.createElement('button')
        taskButton.innerHTML = task.status == 'finalizada' ? '&#10003' : '&#9658'
        if (task.status != 'finalizada') {
            taskButton.onclick = () => speakTaskDetail(task.id)
        }

        taskItem.appendChild(taskContent)
        taskItem.appendChild(taskButton)
        taskList.appendChild(taskItem)
    })
    setupTaskClickEvents()
}

async function speakTaskDetail(taskId) {
    if (!voices) await populateVoices()

    const task = tasks.find(t => t.id === taskId)
    const selectedVoice = localStorage.getItem('selectedVoice')
    const selectedRate = localStorage.getItem('selectedRate')
    let voice = voices.find(v => v.name.startsWith(selectedVoice))

    if (!voice) {
        voice = voices.find(v => v.name.toLowerCase().startsWith(selectedVoice.toLowerCase()))
    }

    const speech = new SpeechSynthesisUtterance(task.detail)
    speech.lang = 'es-ES'

    if (voice) speech.voice = voice

    if (selectedRate) speech.rate = parseFloat(selectedRate)

    successToast('Hablando...')
    speechSynthesis.speak(speech)
}

function toggleMenu() {
    const bottomMenu = document.getElementById('bottomMenu')
    const bottomMenuOverlay = document.getElementById('bottomMenuOverlay')
    const isVisible = bottomMenu.style.display === 'block'

    bottomMenu.style.display = isVisible ? 'none' : 'block'
    bottomMenuOverlay.style.display = isVisible ? 'none' : 'block'
}

function addNewTask() {
    document.getElementById('modal').style.display = 'block'
}

function resetForm() {
    document.getElementById('taskTitle').value = ''
    document.getElementById('taskDetail').value = ''
    document.getElementById('taskStatus').value = 'nueva'
}

function closeModal() {
    resetForm()
    document.getElementById('modal').style.display = 'none'
}

async function saveTask(event) {
    event.preventDefault()

    const taskTitle = document.getElementById('taskTitle').value
    const taskDetail = document.getElementById('taskDetail').value
    const taskStatus = document.getElementById('taskStatus').value

    if (!taskTitle || !taskStatus) {
        errorToast('Por favor, complete el título y el estado de la tarea.')
        return
    }

    const newTask = {
        name: taskTitle,
        detail: taskDetail,
        createdDate: new Date().toISOString().split('.')[0].replace('T', ' '),
        status: taskStatus,
        completed: false
    }

    if (taskStatus === 'finalizada') {
        newTask.endDate = new Date().toISOString().split('.')[0].replace('T', ' ')
    }

    try {
        const response = await fetch('https://66662354d122c2868e4929e1.mockapi.io/todo/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTask)
        })

        if (!response.ok) {
            
            errorToast('La tarea no fue guardada... 😓')
            throw new Error('Failed to save task')
        }

        const savedTask = await response.json()
        tasks.push(savedTask)
        renderTasks()
        closeModal()
        closeMenu()
        successToast('Tarea creada con exito!')
    } catch (error) {
        errorToast('Hay un error en el servicio')
        console.error(error)
    }
}

document.getElementById('taskForm').addEventListener('submit', saveTask)
document.getElementById('modal').addEventListener('click', (event) => {
    if (event.target.id === 'modal') closeModal()
})
document.getElementById('spanClose').addEventListener('click', closeModal)

function openEditModal(taskId) {
    const task = tasks.find(t => t.id == taskId)
    if (!task) {
        errorToast('Tarea no encontrada')
        return
    }

    document.getElementById('editTaskTitle').value = task.name
    document.getElementById('editTaskDetail').value = task.detail
    document.getElementById('editTaskStatus').value = task.status

    document.getElementById('editModal').style.display = 'block'

    document.getElementById('editTaskForm').onsubmit = async function (event) {
        event.preventDefault()

        const updatedTask = {
            ...task,
            name: document.getElementById('editTaskTitle').value,
            detail: document.getElementById('editTaskDetail').value,
            status: document.getElementById('editTaskStatus').value
        }

        if (updatedTask.status === 'finalizada') {
            updatedTask.endDate = new Date().toISOString().split('.')[0].replace('T', ' ')
        } else {
            updatedTask.endDate = null
        }

        await updateTask(task.id, updatedTask)

        closeEditModal()
    }
}

async function updateTask(taskId, updatedTask) {
    try {
        const response = await fetch(`https://66662354d122c2868e4929e1.mockapi.io/todo/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedTask)
        });

        if (!response.ok) {
            errorToast('Fallo la actualización')
            throw new Error('Failed to update task')
        }

        fetchTasks();
        successToast('Tarea guardada con exito!')
    } catch (error) {
        errorToast(error)
        console.error(error)
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none'
}

function setupTaskClickEvents() {
    const taskItems = document.querySelectorAll('.task-container')
    taskItems.forEach(taskItem => {
        taskItem.addEventListener('click', function () {
            const taskId = parseInt(taskItem.dataset.taskId)
            openEditModal(taskId)
        })
    })
}

let voices
async function populateVoices() {
    voices = await new Promise(resolve => {
        speechSynthesis.addEventListener('voiceschanged', () => {
            const allVoices = speechSynthesis.getVoices()
            const spanishVoices = allVoices.filter(voice => voice.lang.startsWith('es'))
            resolve(spanishVoices)
        })
    })
}

populateVoices()

async function configureSettings() {
    if (!voices) {
        voices = await new Promise(resolve => {
            speechSynthesis.addEventListener('voiceschanged', () => {
                resolve(speechSynthesis.getVoices())
            });
        });
    }

    const voiceSelect = document.getElementById('voiceSelect')
    voiceSelect.innerHTML = ''

    voices
        .filter(voice => voice.lang.startsWith('es'))
        .forEach(voice => {
            const option = document.createElement('option')
            option.textContent = `${voice.name}`
            option.setAttribute('data-voice', voice.name)
            voiceSelect.appendChild(option)
        })

    const savedVoice = localStorage.getItem('selectedVoice')
    if (savedVoice) {
        voiceSelect.value = savedVoice
    }

    const savedRate = localStorage.getItem('selectedRate')
    if (savedRate) {
        document.getElementById('rateSelect').value = savedRate
    }

    document.getElementById('settingsModal').style.display = 'block'

    document.getElementById('settingsForm').onsubmit = function (event) {
        event.preventDefault()
        localStorage.setItem('selectedVoice', voiceSelect.value)
        localStorage.setItem('selectedRate', document.getElementById('rateSelect').value)
        document.getElementById('settingsModal').style.display = 'none'

        speechSynthesis.removeEventListener('voiceschanged', configureSettings)
        successToast('Configuracion guardada')
    };

    document.getElementById('settingsModal').addEventListener('click', function (event) {
        if (event.target.id === 'settingsModal') {
            document.getElementById('settingsModal').style.display = 'none'
            speechSynthesis.removeEventListener('voiceschanged', configureSettings)
        }
    })
}

function closeMenu() {
    const bottomMenu = document.getElementById('bottomMenu')
    const bottomMenuOverlay = document.getElementById('bottomMenuOverlay')

    bottomMenu.style.display = 'none'
    bottomMenuOverlay.style.display = 'none'
}

resetForm()