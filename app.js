import { loadHome } from './modules/home.js';
import { loadService } from './modules/service.js';
import { loadProfile } from './modules/profile.js';

const appContent = document.getElementById('app-content');

window.loadModule = function(module, element) {
    // অ্যাক্টিভ ক্লাস পরিবর্তন
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    // কন্টেন্ট লোড করা
    if(module === 'home') appContent.innerHTML = loadHome();
    else if(module === 'service') appContent.innerHTML = loadService();
    else if(module === 'profile') appContent.innerHTML = loadProfile();
    else appContent.innerHTML = `<h3 style="text-align:center;">${module} মডিউল শীঘ্রই আসছে...</h3>`;
}

// ডিফল্টভাবে হোম লোড হবে
window.onload = () => {
    loadModule('home', document.querySelector('.nav-item'));
};
