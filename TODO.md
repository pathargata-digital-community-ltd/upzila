# উপজেলা Admin Panel — পর্যটন ক্যাটাগরি ও সম্পাদনা ToDo

## 1. সেবার ক্যাটাগরি তৈরি ও নির্বাচন
- [x] Admin Panel-এর “সেবা ম্যানেজমেন্ট (পর্যটন/শিক্ষা)” অংশে category dropdown-এ `/services/categories` থেকে বিদ্যমান category এবং Native App-এর built-in category-গুলো দেখাতে হবে; ডেটা না থাকলেও `history_tourism` (পর্যটন) ও `education` (শিক্ষা)-সহ ব্যবহারযোগ্য বিকল্প থাকতে হবে।
- [x] Admin যেন category-এর নিরাপদ key/ID, প্রদর্শন-নাম ও সংক্ষিপ্ত বিবরণ দিয়ে নতুন category তৈরি করতে পারেন; তৈরি করা category dropdown-এ সঙ্গে সঙ্গে selectable হবে এবং Native App-এর service list-এ দেখানোর জন্য `/services/categories/{id}`-এ সামঞ্জস্যপূর্ণ data লিখবে।
- [x] Existing/built-in category-এর key পরিবর্তন বা মুছে ফেলা যাবে না; custom category মুছতে হলে তার `/services/data/{id}`-এ কোনো service record থাকা চলবে না।

## 2. পর্যটন তথ্যের সঠিক শ্রেণিবিভাগ
- [x] `history_tourism` নির্বাচন করলে tourism subcategory selector দেখাতে হবে—`all`, `nature`, `history`, `food_resort`, `culture`, `family`—Native App-এর বর্তমান category ID ও বাংলা label অনুযায়ী; অন্য service category-তে selector লুকানো থাকবে।
- [x] নতুন tourism record `/services/data/history_tourism/{id}`-এ title, phone, details, image ও নির্বাচিত tourism subcategory-সহ সংরক্ষণ করতে হবে, যাতে Native App-এর tourism screen category filter-এ দেখা যায়।

## 3. আগে যোগ করা service/tourism তথ্য edit ও delete
- [x] নির্বাচিত category-এর বিদ্যমান `/services/data/{category}` record-এর তালিকা দেখাতে হবে; প্রতিটি item-এ edit control থাকবে এবং প্রয়োজনমতো delete control থাকবে।
- [x] Edit করলে একই record ID ও একই Firebase path update হবে—duplicate record তৈরি হবে না; বর্তমান title, phone, details, image ও tourism subcategory form-এ পূরণ হবে; Save/Update ও Cancel edit কাজ করবে।
- [x] Delete-এর আগে confirmation দেখাতে হবে; successful add/edit/delete-এর পর তালিকা ও form state refresh হবে।

## 4. Permission ও compatibility
- [x] বিদ্যমান Firebase paths, admin-claim gate, Native App default categories ও পুরোনো service record fields অপরিবর্তিত রাখতে হবে; permission না থাকলে error দেখাতে হবে, authorization bypass করা যাবে না।
- [x] Read-only verification-এর সময় production Firebase data create/update/delete করা যাবে না।