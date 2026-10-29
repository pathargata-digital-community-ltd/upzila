# Pathargata Admin Panel — ২৭-সেকশনের ম্যানুয়াল অডিট

**অডিটের ভিত্তি:** `/home/ubuntu/Pathargata-Native-App`-এর বর্তমান source, `database.rules.json`, এবং `upzila/index.html`। কোনো RTDB rule-এ পুরোনো path থাকা মাত্রেই সেটিকে Native App-এর সক্রিয় feature ধরা হয়নি; app source-এ পড়া/লেখার প্রমাণ খোঁজা হয়েছে। UI থেকে কোনো section সরানো মানে Firebase-এর পুরোনো data মুছে ফেলা নয়।

| # | পুরোনো সেকশন | সিদ্ধান্ত | source/rules-ভিত্তিক পর্যবেক্ষণ ও কাজ |
|---:|---|---|---|
| 1 | Dashboard | রাখা ও redesign | user/post-এর বাস্তব গণনা রাখা হয়েছে; অনুমানভিত্তিক “৩৫% storage” বাদ দিয়ে report count ও moderation shortcut দেখানো হয়েছে। |
| 2 | Verification requests | রাখা | `app/verification.tsx`-এর `verification_requests/{uid}` flow রাখা হয়েছে। approve status `approved` ব্যবহার হয়; duplicate verified-user list Users screen-এ একীভূত। |
| 3 | Outside NID review | নাম বদলে রাখা | এটি app-এর `area_access_requests/{uid}` queue। পুরোনো panel ভুল করে `/users`-এ status query করত। Queue-কে canonical path-এ নেওয়া হয়েছে; approve করলে `users/{uid}`-এ `accountAccess/accessReview/status` app gate অনুযায়ী update হয়। Reject করলে `accessReview='pending'` রাখা হয়, যাতে ব্যবহারকারী পুনরায় আবেদন করতে পারেন। |
| 4 | Live chat/support | সরানো | Native App-এর direct message end-to-end encrypted। Admin panel-এর `/chats` পড়া `chat_members`-এর নিয়মের সঙ্গে মেলে না এবং ব্যক্তিগত কথোপকথন উন্মুক্ত করতে পারে। UI, listener ও chat-content decrypt/send handlers সরানো হয়েছে। |
| 5 | Reports | রাখা ও পুনর্নির্মাণ | app-এর `reports/{postId}/{reporterUid}`, `user_reports/{reportedUid}/{reporterUid}`, `reported_comments/{reportId}`, `market_reports/{productId}/{reporterUid}`, `message_reports/{chatId}/{messageId}/{reporterUid}` source-ভিত্তিক queue একত্র করা হয়েছে। মেসেজ রিপোর্টে কেবল metadata দেখানো হয়; encrypted content নয়। একই report একাধিকবার এলে queue render debounce ও target-read cache করা হয়। |
| 6 | Notice board | রাখা | app root `notices` পড়ে; notice প্রকাশ/মুছতে পারা রাখা হয়েছে। এটিকে OneSignal broadcast-এর সঙ্গে মেলানো হয়নি। |
| 7 | Notes / 24-hour story moderation | সরানো | বর্তমান Native App-এ feature consumer/producer পাওয়া যায়নি। UI, active listener ও পুরোনো story actions সরানো; Firebase-এর পুরোনো records অক্ষত। |
| 8 | Contest | সরানো | Native App source-এ contest workflow নেই। UI, listener ও contest handlers সরানো; পুরোনো data মুছিনি। |
| 9 | Tourism / education services | রাখা | app-এর `services/data` এবং education notice content-এর ব্যবস্থাপনা রাখা হয়েছে। |
| 10 | Transport | রাখা | Native routes-এর সঙ্গে মিলে বাস, rent-a-car ও transport-banner workflow রাখা হয়েছে। |
| 11 | Directory | রাখা | app `directory/{category}` ব্যবহার করে; `directory_edits` ও `directory_reviews`-ও রাখা হয়েছে। |
| 12 | Marketplace | রাখা ও উন্নত | app-এর `market_items`, `market_shops`, `market_orders` contracts যাচাই করা হয়েছে। পণ্য ও দোকানের পৃথক moderation view, দোকান যাচাই/ব্যাজ প্রত্যাহার ও listing অপসারণ যোগ হয়েছে। Admin list indexed `time` query-তে সাম্প্রতিক সর্বোচ্চ ২০০টি করে দেখায়; private buyer/seller order data তালিকায় ছড়ানো হয়নি। |
| 13 | Blood service | রাখা | donor consent-aware handling এবং private blood request queue রাখা হয়েছে; donor phone public projection-এ কপি করা হয় না। |
| 14 | Emergency alerts | রাখা | `emergency_alerts` এবং `emergency_alert_private` পৃথকভাবে বিবেচনা; সংবেদনশীল যোগাযোগের তথ্য public ধরে নেওয়া হয়নি। |
| 15 | User tracking logs | সরানো | app-এ বর্তমান use case নেই। Panel-এর tracking listener, UI/helper ও read সরানো; ইতিহাস মুছিনি। |
| 16 | All users | রাখা ও নিরাপদ করা | profile `role`-কে admin authority হিসেবে দেখানো/সম্পাদনা বাদ। Admin কেবল Firebase Auth-এর `admin: true` custom claim; user status থেকে নিরাপদ suspend/reactivate action যোগ। সাধারণ user list থেকে সরাসরি profile delete বাদ; deletion request queue রাখা। |
| 17 | Verified users | Users-এ একীভূত | duplicate verified-user table/function বাদ; Users তালিকায় verification status রাখা এবং actual আবেদন Verification-এ রাখা। |
| 18 | Tourist users | আলাদা section সরানো | Native App-এ tourist-specific screen/workflow পাওয়া যায়নি। rules-এ থাকা status safeguards অক্ষত। |
| 19 | Account deletion requests | রাখা | `account_deletion_requests/{uid}` ও `account_lifecycle_requests/{uid}` review রাখা। Cloudinary media মুছে ফেলা হয়েছে—এমন দাবি করা হয় না; বিশ্বস্ত server endpoint ছাড়া media deletion অসম্পূর্ণ। |
| 20 | Trash bin | রাখা | post restore/trash management রাখা হয়েছে; permanent media deletion-এর server-side limitation স্পষ্ট। |
| 21 | Monetization / withdrawals | সরানো | Native App-এর সক্রিয় consumer/producer নেই। withdrawal UI/listener/action সরানো; পুরোনো RTDB data অক্ষত। |
| 22 | Sponsored ads | সরানো | app root `ads` পড়ার সক্রিয় পথ নেই। ad tab/listener/control ও orphaned create handler সরানো; পুরোনো records অক্ষত। |
| 23 | Post moderation | রাখা ও harden | `posts`/`public_posts` সক্রিয়। Post card-এ user-generated text escape, HTTPS media URL validation ও lazy media করা হয়েছে; report থেকে feed removal যোগ। Cloudinary asset আলাদাভাবে মুছবে না—তা UI-তে জানানো হয়। |
| 24 | Complaints | রাখা ও enum ঠিক করা | app-এর বৈধ status `Submitted`, `In Progress`, `Resolved`, `Rejected`; পুরোনো `Pending`/`Processing` option বাদ এবং badge logic মিলানো হয়েছে। |
| 25 | OneSignal broadcast | সরানো | Native App-এ OneSignal integration নেই। browser-side REST-key পাঠানো/মুছার handler ও broadcast UI সরানো হয়েছে। আগের কোনো key OneSignal-এ প্রকাশিত হয়ে থাকলে তা আলাদাভাবে revoke/rotate করা দরকার। |
| 26 | Locations | রাখা | registration/onboarding-এর `locations` data drives this feature; union/village editor রাখা হয়েছে। |
| 27 | Settings | website তথ্য অক্ষত; obsolete controls সরানো | website/landing-page version, link, display statistic, screenshot, app name ও app links অক্ষত। Native App-এর `native_app_version`, `native_update_link`, `app_download_url`, maintenance, AI toggle, privacy/terms এবং ব্যবহৃত `verification_plans` রাখা হয়েছে। App consumer না পাওয়া পুরোনো `app_version` OTA control, `payment_numbers` এবং `point_system` UI/read/write handlers সরানো হয়েছে; সংশ্লিষ্ট Firebase data মুছিনি। |

## নিরাপত্তা ও deployment নোট

- অডিটে `app/area-approval.tsx` `area_access_requests/{uid}`-এ আবেদন লেখে দেখা গেছে, কিন্তু `database.rules.json`-এ এই path-এর কোনো rule ছিল না। নতুন rule-এ app owner শুধু নিজের pending request তৈরি/পুনরায় জমা দিতে পারবেন; কেবল `auth.token.admin === true` queue পড়তে/সিদ্ধান্ত নিতে পারবেন। NID URL-ও Cloudinary HTTPS URL হিসেবে validate হয়। Native App submit flow-তে profile-এর protected gate fields আর client থেকে পরিবর্তন হয় না—শুধু নিজের NID URL ও request queue atomicভাবে লেখা হয়।
- নতুন RTDB rule এই repository-তে যোগ হয়েছে, কিন্তু Firebase project-এ deploy করা হয়নি। Rules deploy না হওয়া পর্যন্ত নতুন NID queue panel/app-এ কার্যকর হবে না এবং আবেদন submission permission denied হতে পারে।
- Panel-এর ১৮টি navigation target-এর প্রতিটির matching tab আছে; বাদ দেওয়া UI থেকে কোনো Firebase data bulk-delete করা হয়নি।
- Cloudinary upload client-এর unsigned preset ব্যবহার করে; trusted server-side delete/destroy endpoint app বা panel source-এ পাওয়া যায়নি। তাই trashed post-এর Cloudinary file auto-delete হবে না।
- Native app source-এ OneSignal integration পাওয়া যায়নি; deleted panel handler key revoke/rotate করেনি। Cloudinary deletion endpoint বা OneSignal key rotation হয়নি—এগুলো আলাদা server/account-side কাজ।
- Firebase rules file ও panel source repo-তে থাকা পরিবর্তন; GitHub Pages push এবং Firebase live rules deployment আলাদা অপারেশন।

- Local Firebase RTDB emulator test: ১৯টি test file-এর ১০৬টি test পাস করেছে, নতুন area-access owner/admin authorization tests-সহ।
- Native App TypeScript check (`pnpm run check`) সফল হয়েছে।
- Lock screen-এর Admin Contact: বিদ্যমান WhatsApp link অক্ষত রেখে Settings-এ Telegram link যোগ করা হয়েছে; Native App কেবল অনুমোদিত domain-এর HTTPS link-ই খোলে।
