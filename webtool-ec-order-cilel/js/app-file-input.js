// DISABLED: This code is now handled in app-state-core.js to prevent duplicate event listeners
// which was causing the auto-download bug when files are uploaded.
//
// (function(){
//   const dropZone = document.getElementById('dropZone');
//   const fileInput = document.getElementById('fileInput');
//   if (dropZone && fileInput) {
//     dropZone.addEventListener('click', () => {
//       fileInput.click();
//     });
//   }
// })();

// Initialize application after all scripts are loaded
ensurePersistentStorage();
initDB();
restoreFromLocalCache();
