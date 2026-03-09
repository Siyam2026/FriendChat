// Home Logic
let socket;
let currentUser = null;
let selectedFriend = null;

async function init() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/pages/login.html';
            return;
        }
        currentUser = await res.json();
        document.getElementById('myName').innerText = currentUser.name;
        document.getElementById('myAvatar').src = currentUser.profilePicture;

        setupSocket();
        loadFriends();
    } catch (err) {
        console.error(err);
    }
}

function setupSocket() {
    socket = io();
    socket.emit('userOnline', currentUser._id);

    socket.on('receiveMessage', (msg) => {
        if (selectedFriend && (msg.senderId === selectedFriend._id || msg.receiverId === selectedFriend._id)) {
            appendMessage(msg);
        }
        // Update last message in friend list
        loadFriends();
    });

    socket.on('updateStatus', ({ userId, status }) => {
        const dot = document.querySelector(`.status-dot[data-id="${userId}"]`);
        if (dot) {
            dot.classList.toggle('online', status);
        }
    });

    socket.on('typing', ({ senderId }) => {
        if (selectedFriend && selectedFriend._id === senderId) {
            document.getElementById('typingIndicator').style.display = 'block';
        }
    });

    socket.on('stopTyping', ({ senderId }) => {
        if (selectedFriend && selectedFriend._id === senderId) {
            document.getElementById('typingIndicator').style.display = 'none';
        }
    });
}

async function loadFriends() {
    const res = await fetch('/api/friend/friends');
    const friends = await res.json();
    const list = document.getElementById('friendList');
    list.innerHTML = '';

    friends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        item.innerHTML = `
            <img src="${friend.profilePicture}" class="avatar">
            <div class="friend-info">
                <div class="friend-name">
                    ${friend.name}
                    <span class="status-dot ${friend.onlineStatus ? 'online' : ''}" data-id="${friend._id}"></span>
                </div>
                <div class="last-msg">Click to chat</div>
            </div>
        `;
        item.onclick = () => openChat(friend);
        list.appendChild(item);
    });
}

async function openChat(friend) {
    selectedFriend = friend;
    const chatArea = document.querySelector('.app-container');
    
    // Replace welcome screen with chat UI if not already there
    let chatUI = document.getElementById('chatUI');
    if (!chatUI) {
        document.getElementById('welcomeScreen').style.display = 'none';
        chatUI = document.createElement('div');
        chatUI.id = 'chatUI';
        chatUI.className = 'chat-area';
        chatUI.innerHTML = `
            <div class="chat-header">
                <img id="chatAvatar" src="" class="avatar">
                <div>
                    <h4 id="chatName"></h4>
                    <span id="chatStatus" style="font-size: 0.8rem; color: var(--text-secondary);"></span>
                </div>
            </div>
            <div class="chat-messages" id="messageContainer"></div>
            <div id="typingIndicator" class="typing-indicator" style="display: none;">Friend is typing...</div>
            <div class="chat-input-container">
                <button class="icon-btn"><i class="far fa-smile"></i></button>
                <input type="text" id="msgInput" class="chat-input" placeholder="Type a message">
                <button class="icon-btn" id="sendBtn"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
        document.querySelector('.app-container').appendChild(chatUI);
        
        setupChatInput();
    }

    document.getElementById('chatName').innerText = friend.name;
    document.getElementById('chatAvatar').src = friend.profilePicture;
    document.getElementById('chatStatus').innerText = friend.onlineStatus ? 'Online' : 'Offline';

    loadMessages(friend._id);
}

function setupChatInput() {
    const input = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');

    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    let typingTimeout;
    input.oninput = () => {
        socket.emit('typing', { senderId: currentUser._id, receiverId: selectedFriend._id });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping', { senderId: currentUser._id, receiverId: selectedFriend._id });
        }, 2000);
    };
}

async function sendMessage() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text || !selectedFriend) return;

    const msgData = {
        senderId: currentUser._id,
        receiverId: selectedFriend._id,
        text: text
    };

    socket.emit('sendMessage', msgData);
    appendMessage({ ...msgData, createdAt: new Date() }, true);
    input.value = '';
    socket.emit('stopTyping', { senderId: currentUser._id, receiverId: selectedFriend._id });
}

async function loadMessages(friendId) {
    const res = await fetch(`/api/message/${friendId}`);
    const messages = await res.json();
    const container = document.getElementById('messageContainer');
    container.innerHTML = '';
    messages.forEach(msg => appendMessage(msg));
}

function appendMessage(msg, isSentOptimistic = false) {
    const container = document.getElementById('messageContainer');
    const div = document.createElement('div');
    const isSent = isSentOptimistic || msg.senderId === currentUser._id;
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
        <div class="text">${msg.text}</div>
        <div class="message-time">${time}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Search Functionality
const searchBtn = document.getElementById('searchBtn');
const searchModal = document.getElementById('searchModal');
const closeModal = document.getElementById('closeModal');
const userSearchInput = document.getElementById('userSearchInput');
const searchResults = document.getElementById('searchResults');

searchBtn.onclick = () => searchModal.style.display = 'block';
closeModal.onclick = () => searchModal.style.display = 'none';
window.onclick = (e) => { if (e.target == searchModal) searchModal.style.display = 'none'; };

userSearchInput.oninput = async () => {
    const query = userSearchInput.value.trim();
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }

    const res = await fetch(`/api/friend/searchUser?name=${query}`);
    const users = await res.json();
    searchResults.innerHTML = '';

    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <img src="${user.profilePicture}" class="avatar">
                <span>${user.name}</span>
            </div>
            <button class="btn-accept" onclick="sendFriendRequest('${user._id}')">Add Friend</button>
        `;
        searchResults.appendChild(item);
    });
};

async function sendFriendRequest(userId) {
    const res = await fetch('/api/friend/sendRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId })
    });
    const data = await res.json();
    alert(data.message);
}

// Notifications & Logout
document.getElementById('notifBtn').onclick = () => window.location.href = '/pages/notifications.html';
document.getElementById('logoutBtn').onclick = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/pages/login.html';
};

init();
