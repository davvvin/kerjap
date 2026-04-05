// popup.js — shared error popup utility

function showPopup(message) {
    document.getElementById('popupMsg').textContent = message;
    document.getElementById('popupOverlay').classList.add('show');
}

function closePopup() {
    document.getElementById('popupOverlay').classList.remove('show');
}

// close on overlay click
document.addEventListener('click', function(e) {
    if (e.target.id === 'popupOverlay') closePopup();
});
