export function loadHome() {
    return `
        <!-- Stories -->
        <div class="story-container">
            <div class="story" style="background: url('https://picsum.photos/200/300?random=1'); background-size: cover;"></div>
            <div class="story" style="background: url('https://picsum.photos/200/300?random=2'); background-size: cover;"></div>
            <div class="story" style="background: url('https://picsum.photos/200/300?random=3'); background-size: cover;"></div>
        </div>

        <!-- Post Creation -->
        <div class="post-box">
            <img src="https://via.placeholder.com/40" style="border-radius:50%">
            <input type="text" placeholder="আপনার মনে কি আছে?">
        </div>

        <!-- Posts -->
        <div class="post-card">
            <div class="post-header">
                <img src="https://via.placeholder.com/40">
                <div><strong>উপজেলা এডমিন</strong><br><small>২ ঘণ্টা আগে</small></div>
            </div>
            <p>আমাদের উপজেলায় নতুন ডিজিটাল লাইব্রেরি উদ্বোধন করা হয়েছে। সবাইকে আমন্ত্রণ!</p>
            <img src="https://picsum.photos/400/200" style="width:100%; border-radius:8px;">
        </div>
    `;
}
