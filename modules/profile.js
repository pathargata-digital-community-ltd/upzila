export function loadProfile() {
    return `
        <div style="background:white; border-radius:10px; overflow:hidden;">
            <div style="height:150px; background:linear-gradient(to right, #1877f2, #00c6ff);"></div>
            <div style="text-align:center; margin-top:-50px;">
                <img src="https://via.placeholder.com/100" style="width:100px; height:100px; border-radius:50%; border:5px solid white;">
                <h2>আপনার নাম</h2>
                <p>সাভার, ঢাকা</p>
            </div>
            <hr>
            <div style="padding:15px;">
                <button style="width:100%; padding:10px; background:#e4e6eb; border:none; border-radius:5px; margin-bottom:10px;">এডিট প্রোফাইল</button>
                <button style="width:100%; padding:10px; background:var(--primary-color); color:white; border:none; border-radius:5px;">পোস্ট করুন</button>
            </div>
        </div>
    `;
}
