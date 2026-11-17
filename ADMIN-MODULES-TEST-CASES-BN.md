# Upzila Admin Panel — নতুন মডিউল Test Cases ও Code Review Checklist

এই ডকুমেন্টটি নতুন যোগ করা Admin Panel ফিচারগুলো production data পরিবর্তন না করে যাচাই করার জন্য তৈরি করা হয়েছে। প্রথমে Firebase Emulator বা আলাদা test dataset ব্যবহার করুন। Live database-এ destructive test চালাবেন না।

> **Authorization prerequisite:** Admin account-এর Firebase Auth custom claim অবশ্যই `{ "admin": true }` হতে হবে। শুধু profile-এর `role` field বা `admin@gmail.com` email Admin access-এর প্রমাণ নয়।

## ১. Test প্রস্তুতি

### প্রয়োজনীয় test account

| Account | প্রত্যাশিত ক্ষমতা |
|---|---|
| Firebase Auth account with `{ "admin": true }` custom claim | Admin Panel login, নতুন queue পড়া এবং অনুমোদিত update |
| সাধারণ authenticated user | Admin Panel access প্রত্যাখ্যাত |
| unauthenticated browser | Firebase data পড়া/লেখা প্রত্যাখ্যাত |
| seller test account | নিজের order workflow পরিবর্তন করতে পারবে |
| buyer test account | নিজের pending order cancel করতে পারবে |

### Test data

আলাদা test UID ও test record ব্যবহার করুন:

- `market_orders/test-order-001`
- `feedback_submissions/test-feedback-001`
- `stories/test-story-001`
- `monetization_requests/test-monetization-001`
- `withdraw_requests/test-withdraw-001`
- `super_admin_audit/test-audit-001`

Firebase Console-এ Rules কপি করার আগে emulator-এ চালানো সর্বোত্তম। Live database ব্যবহার করলে test record শেষে সম্পূর্ণ remove করুন।

## ২. Smoke Test — Admin Panel খোলা ও login

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| SM-01 | Admin login | Admin email/password দিয়ে login করুন | Dashboard খুলবে; login overlay চলে যাবে |
| SM-02 | Non-admin login | সাধারণ user দিয়ে login করুন | Admin claim না থাকায় Panel access বন্ধ হবে |
| SM-03 | Sidebar navigation | Orders, Feedback, Stories, Finance, Audit এবং Blood Service → Operator আবেদন menu একে একে চাপুন | প্রতিটি tab খুলবে; অন্য tab hidden থাকবে; pending operator application badge-এ দেখা যাবে |
| SM-04 | Refresh persistence | Admin login-এর পর browser refresh করুন | Firebase Auth session থাকলে Panel আবার খুলবে |
| SM-05 | Mobile layout | 360–430px viewport-এ menu খুলুন | Sidebar overlay, tab content এবং buttons কাটা যাবে না |
| SM-06 | Empty state | কোনো test data না রেখে নতুন tab খুলুন | “কোনো record পাওয়া যায়নি” ধরনের safe empty state দেখাবে |

## ৩. Marketplace Order Management

### Read এবং filtering

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| ORD-01 | Order list load | Admin login করে Orders tab খুলুন | `market_orders` থেকে সর্বোচ্চ ৩০০টি সাম্প্রতিক order দেখা যাবে |
| ORD-02 | Newest first | বিভিন্ন timestamp-এর order তৈরি করুন | সর্বশেষ order আগে থাকবে |
| ORD-03 | Status filter | Pending, Accepted, Preparing, Shipped, Delivered, Cancelled নির্বাচন করুন | শুধু নির্বাচিত status-এর record দেখা যাবে |
| ORD-04 | Buyer/seller data | একটি order খুলুন | Product, buyer/seller, quantity, price, phone এবং time দেখা যাবে |
| ORD-05 | Invalid/missing fields | অসম্পূর্ণ test order দিন | UI ভেঙে না গিয়ে fallback label দেখাবে |

### Status update

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| ORD-06 | Pending → Accepted | Pending order-এ Accepted save করুন | `fulfillmentStatus=accepted`, `status=pending` হবে |
| ORD-07 | Accepted → Preparing | Accepted order update করুন | Status update হবে এবং timestamp/updatedBy যুক্ত হবে |
| ORD-08 | Preparing → Shipped | Preparing order update করুন | Shipped status দেখা যাবে |
| ORD-09 | Shipped → Delivered | Shipped order update করুন | `fulfillmentStatus=delivered` এবং `status=delivered` হবে |
| ORD-10 | Cancelled order | Cancelled নির্বাচন করে save করুন | Confirmation dialog-এর পরে order cancelled হবে |
| ORD-11 | No-op update | বর্তমান status-ই আবার save করুন | নতুন write বা duplicate audit তৈরি হবে না |
| ORD-12 | Audit created | যেকোনো valid status update করুন | `super_admin_audit`-এ action, target, before, after, reason, actorUid ও timestamp থাকবে |
| ORD-13 | Failed update | Rules deploy না করে status update চেষ্টা করুন | Safe error দেখাবে; UI hang করবে না |

### Order security negative tests

- সাধারণ user যেন `market_orders` root-এর সব order পড়তে না পারে।
- Buyer যেন অন্য buyer-এর order পড়তে না পারে।
- Seller যেন অন্য seller-এর order update করতে না পারে।
- Buyer pending ছাড়া অন্য status নিজে cancel করতে না পারে।
- Product ID, buyer UID, seller UID, quantity এবং original time যেন Admin status update-এর সময় পরিবর্তন করা না যায়।
- Anonymous বা unauthenticated client যেন order list পড়তে বা লিখতে না পারে।

## ৪. Feedback ও Missing Query

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| FB-01 | Queue load | Feedback tab খুলুন | Feedback ও Missing Query list দেখা যাবে |
| FB-02 | Type display | `type=feedback` এবং `type=missing` record দিন | আলাদা label দেখা যাবে |
| FB-03 | Pending badge | Pending record রাখুন | Sidebar badge-এ pending count দেখা যাবে |
| FB-04 | Status update | Pending → In Progress → Resolved করুন | প্রতিটি status save হবে |
| FB-05 | Admin reply | Reply লিখে save করুন | `adminReply`, `updatedAt`, `reviewedBy` সংরক্ষিত হবে |
| FB-06 | Long text | 3000 অক্ষরের reply দিন | অনুমোদিত সীমার মধ্যে save হবে; অতিরিক্ত text reject হবে |
| FB-07 | Filter | সব status filter একে একে নির্বাচন করুন | সঠিক record subset দেখা যাবে |
| FB-08 | Audit | Feedback update করুন | Audit log-এ before/after reply ও status থাকবে |
| FB-09 | User privacy | User app থেকে feedback history পড়ুন | User শুধু নিজের UID-এর record দেখতে পারবে |
| FB-10 | Admin-only update | সাধারণ user অন্য user-এর feedback update চেষ্টা করুক | `permission_denied` হবে |

## ৫. Story Moderation

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| ST-01 | Story list | Stories tab খুলুন | সর্বশেষ story list দেখা যাবে |
| ST-02 | Active filter | Expiry ভবিষ্যতের story রাখুন | Active filter-এ story দেখা যাবে |
| ST-03 | Expired filter | Expiry অতীতের story রাখুন | Expired filter-এ story দেখা যাবে |
| ST-04 | Media fallback | Image/media ছাড়া text story দিন | Placeholder card দেখাবে |
| ST-05 | Safe media URL | Valid Cloudinary URL দিন | Preview দেখা যাবে |
| ST-06 | Remove story | Story remove চাপুন ও confirmation দিন | Firebase story record remove হবে |
| ST-07 | Cancel remove | Confirmation dialog-এ Cancel চাপুন | কোনো write হবে না |
| ST-08 | Audit | Story remove করুন | Audit log-এ `story_removed` target থাকবে |
| ST-09 | Story privacy | সাধারণ user অন্যের story payload edit/delete চেষ্টা করুক | Active story-তে permission denied হবে |

Cloudinary asset delete বর্তমানে server-side signed endpoint ছাড়া চালু করা যাবে না। তাই এই test-এ Firebase record removal এবং safe UI behavior যাচাই হবে; Cloudinary asset removal-এর জন্য আলাদা backend release প্রয়োজন।

## ৬. Monetization ও Withdraw

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| FIN-01 | Monetization queue | Finance → Monetization খুলুন | Request list দেখা যাবে |
| FIN-02 | Withdraw queue | Finance → Withdraw খুলুন | Withdrawal list দেখা যাবে |
| FIN-03 | Status update | Pending → Approved করুন | Status, reviewedAt, reviewedBy save হবে |
| FIN-04 | Reject | Pending → Rejected করুন | Rejected status দেখা যাবে |
| FIN-05 | Paid status | Withdraw record-এ Paid দিন | Paid status সংরক্ষিত হবে |
| FIN-06 | Admin note | Note লিখে save করুন | `adminNote` সংরক্ষিত হবে |
| FIN-07 | Audit | Finance record update করুন | `finance_review` audit record তৈরি হবে |
| FIN-08 | Sensitive data | Payment number/transaction reference দেখুন | শুধু authorized Admin দেখতে পারবে; UI-তে PIN/OTP চাইবে না |
| FIN-09 | Duplicate click | Save button দ্রুত একাধিকবার চাপুন | Duplicate বা conflicting write তৈরি হবে না |

## ৭. Admin Audit Log

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| AUD-01 | Log load | Audit Log tab খুলুন | সর্বশেষ audit records আগে দেখা যাবে |
| AUD-02 | Actor | Order/Feedback/Story/Finance update করুন | `actorUid` বর্তমান Admin UID হবে |
| AUD-03 | Target | একটি update করুন | Target সঠিক Firebase path হবে |
| AUD-04 | Before/after | Status পরিবর্তন করুন | আগের ও পরের value দেখা যাবে |
| AUD-05 | Reason | Audit record খুলুন | Operation reason থাকবে |
| AUD-06 | Immutable log | Existing audit record edit/delete চেষ্টা করুন | Firebase Rules write reject করবে |
| AUD-07 | Non-admin read | সাধারণ user audit root পড়ুক | `permission_denied` হবে |
| AUD-08 | Failed operation | Permission failure ঘটান | Failure যেন false success audit হিসেবে না লেখা হয় |

## ৮. Firebase Rules Code Review Checklist

- `market_orders` root read শুধু authorized Admin বা নিজের buyer/seller query-তে সীমাবদ্ধ আছে।
- Order child update-এ immutable fields—`productId`, `sellerUid`, `buyerUid`, `quantity`, `time`—পরিবর্তন করা যাচ্ছে না।
- Order status শুধুমাত্র অনুমোদিত enum-এর মধ্যে আছে।
- `delivered` বা `cancelled` হলে top-level `status` ও `fulfillmentStatus` সামঞ্জস্যপূর্ণ থাকে।
- `feedback_submissions`-এ Admin update করতে পারে, user শুধু নিজের নতুন pending record তৈরি করতে পারে।
- `stories`-এ Admin moderation write রাখা হলেও সাধারণ user অন্যের active story edit করতে পারে না।
- `monetization_requests` ও `withdraw_requests` Admin-only read/write।
- `super_admin_audit` read Admin-only এবং existing event immutable।
- সব Admin authorization path-এ একই `auth.token.admin === true` custom-claim policy থাকতে হবে; email বা profile role fallback রাখা যাবে না।
- Rules পরিবর্তনের পরে Emulator suite চালাতে হবে; শুধু JSON valid হওয়া যথেষ্ট নয়।

## ৯. Automated validation commands

Upzila Admin Panel:

```bash
cd /home/ubuntu/upzila
python3 -m http.server 8090 --bind 0.0.0.0
# অন্য terminal-এ
curl -fsS http://127.0.0.1:8090/ >/dev/null
node --check /tmp/upzila-admin-module.mjs
```

Native App Rules:

```bash
cd /home/ubuntu/Pathargata-Native-App
python3 -m json.tool database.rules.json >/dev/null
pnpm test:rules
```

বর্তমান baseline হিসেবে Rules suite-এ ২২টি test file এবং ১৩৬টি test pass করেছে। নতুন order Admin permission-এর জন্য আলাদা test যোগ করা হলে অন্তত এগুলো আবশ্যক:

```text
admin can read market_orders root
admin can update only order workflow fields
admin cannot reassign buyer/seller/product
non-admin cannot read another user's order
audit event cannot be edited or deleted
```

## ১০. Final acceptance criteria

Release-ready বলা যাবে কেবল তখনই যখন:

1. Admin claim account সব নতুন tab খুলতে পারে।
2. Non-admin এবং unauthenticated account কোনো Admin data বা control ব্যবহার করতে পারে না।
3. Order, Feedback, Story এবং Finance update-এর পরে audit record তৈরি হয়।
4. Invalid status, missing field এবং duplicate click safe ভাবে handle হয়।
5. Firebase Rules Emulator suite pass করে।
6. Firebase Console-এর live Rules repository version-এর সঙ্গে মিলে যায়।
7. Cloudinary signed delete endpoint ছাড়া কোনো destructive media delete চালু করা হয় না।
8. Production test করার আগে test records backup ও cleanup করা হয়।
9. Blood Service → Operator আবেদন tab indexed query দিয়ে শুধু pending request আনে; প্রতিটি submission-এর নতুন `revisionId` থাকে এবং Admin-এর displayed revision বর্তমান request-এর সঙ্গে মিললেই approve/reject lock নেয়। Approval-এ `blood_partner_access/{uid}`-এ `blood_operator` ও `pathargata_all` membership, request status/review metadata এবং audit event একই atomic multi-location update-এ লেখা হয়; rejection-এ request status/review metadata ও audit event atomicভাবে লেখা হয়। বিপরীত সিদ্ধান্ত lock থাকলে সফল হয় না, একই সিদ্ধান্ত retry করা যায়, stale card নতুন আবেদন বদলাতে পারে না, rejection-এর পরে applicant নতুন revision-এ পুনরায় আবেদন করতে পারে, এবং কাউকে `admin: true` claim দেওয়া হয় না।

## Blood operator application review — Admin panel smoke tests

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| BLOOD-APP-01 | Navigation | Admin login করে Sidebar → রক্ত সেবা → Operator আবেদন খুলুন | আবেদন tab ও pending-count badge দেখা যায়; area/NID review-এর সঙ্গে গুলিয়ে যায় না |
| BLOOD-APP-02 | Pending-only queue | pending ও approved request রাখুন | Indexed query শুধু `status=pending` আবেদন আনে; সংস্থার নাম, আবেদনকারীর নাম, ইমেইল, ফোন, সময় ও UID নিরাপদভাবে escape হয়ে দেখায় |
| BLOOD-APP-03 | Approve | আবেদন যাচাই করে অনুমোদন চাপুন | card-এর `revisionId` বর্তমান record-এর সঙ্গে মিলিয়ে lock নেয়; membership `role=blood_operator`, `scope=pathargata_all`, `active=true`, approved review metadata ও audit এক atomic update-এ লেখা হয় |
| BLOOD-APP-04 | Reject | pending আবেদন প্রত্যাখ্যান করুন | lock-সহ rejection status/review metadata/audit atomicভাবে লেখা হয়; operator membership তৈরি হয় না; applicant পরে আবার আবেদন করতে পারে |
| BLOOD-APP-05 | Competing decision | একটি Admin approve lock নেওয়ার পর অন্য Admin reject চাপুন | বিপরীত বাটন disabled থাকে এবং rules-ও conflicting সিদ্ধান্ত প্রত্যাখ্যান করে |
| BLOOD-APP-06 | Permission denied | Firebase Rules-এ Admin read permission না রেখে queue load করুন | অনুমতি-সংক্রান্ত error ও retry control দেখায়; খালি তালিকা বলে ভুল দেখায় না |
| BLOOD-APP-07 | Non-admin | সাধারণ user account দিয়ে UI action trigger করার চেষ্টা করুন | custom claim gate UI access বন্ধ করে; Firebase Rules request/membership-এ write reject করে |
| BLOOD-APP-08 | Resume same decision | write failure/refresh-এর পরে card-এ আগের lock দেখা গেলে একই সিদ্ধান্ত চাপুন | একই সিদ্ধান্তের retry/resume চলে; বিপরীত সিদ্ধান্ত বেছে নেওয়া যায় না |
| BLOOD-APP-09 | Stale card | revision-1 আবেদন reject হওয়ার পরে একই UID revision-2 দিয়ে আবেদন করুক; revision-1 খোলা card থেকে সিদ্ধান্ত দিন | transaction revision mismatch-এ abort হয়; revision-2 pending থাকে, কোনো membership/audit decision তৈরি হয় না এবং Admin-কে তালিকা refresh করতে বলা হয় |

Admin panel path: **Sidebar → রক্ত সেবা → Operator আবেদন**. **“এলাকা প্রবেশ অনুমোদন”** হলো NID/location review-এর tab; blood operator application সেখানে নয়।


## জরুরি SOS / alert management — Admin smoke tests

Navigation: **Sidebar → জরুরি এলার্ট**. Emergency contact directory edit করতে **হাসপাতাল/জরুরি যোগাযোগ** button বা **ডিরেক্টরি → Hospital / Health** ব্যবহার করুন। User app-এর hospital path `directory/health`; `directory/hospital` কেবল legacy record দেখার জন্য।

| ID | Test | ধাপ | Expected result |
|---|---|---|---|
| SOS-01 | Queue ও badge | Admin claim account দিয়ে লগইন করে জরুরি এলার্ট tab খুলুন | Real-time `emergency_alerts` load হবে; চলমান, যাচাই বাকি, মোট count ও unverified sidebar badge মিলবে |
| SOS-02 | Filter | চলমান, যাচাই বাকি, সাড়া দেওয়া, সমাধান, বাতিল ও সব filter নির্বাচন করুন | সঠিক status/verification record দেখা যাবে; empty state স্পষ্ট হবে |
| SOS-03 | Private data | একটি alert-এ ব্যক্তিগত যোগাযোগের তথ্য দেখার বোতাম চাপুন | Admin claim-authorized `emergency_alert_private/{id}` থেকে নাম/ফোন/আক্রান্ত/জিপিএস দেখা যাবে; call ও map link হবে; public alert বা audit-এ PII থাকবে না |
| SOS-04 | Verify | `unverified` alert যাচাই করুন | `verificationStatus=verified`, `updatedAt`, `updatedBy` এবং একই atomic update-এর `super_admin_audit` event লেখা হবে |
| SOS-05 | Reject | ভুল/অনুপযুক্ত alert reject করুন | `verificationStatus=rejected`, `status=cancelled`; কারণ audit-এ থাকবে; public active SOS list থেকে বাদ যাবে |
| SOS-06 | Response lifecycle | reported → responding → resolved সম্পন্ন করুন | User app-এর live alert status বদলাবে; status transition ও Admin actor timestamp rules validation-এ পাস করবে |
| SOS-07 | Cancel/reopen | Active alert বাতিল করুন; পরে reopen করুন | বাতিলে confirmation/reason ও audit থাকবে; reopen করলে cancelled→reported বা resolved→responding হবে; rejected record reopen করলে `verificationStatus=unverified` হয়ে আবার active queue-তে আসবে |
| SOS-08 | Atomic audit | Admin Panel থেকে status/verification action সম্পন্ন করুন | Panel-এর alert update এবং immutable `super_admin_audit` একই multi-location write-এ থাকবে; audit write ব্যর্থ হলে Panel action ব্যর্থ হবে |
| SOS-09 | Concurrent/stale card | অন্য Admin ইতিমধ্যে state বদলানোর পরে পুরোনো কার্ড থেকে action চাপুন | UI latest record মিলিয়ে stale action থামাবে; Firebase Rules শুধু অনুমোদিত transition নেবে |
| SOS-10 | Permission failure | private read বা update-এর Admin permission বাদ দিয়ে emulator চালান | Permission/error state দেখা যাবে; contact data বা success status মিথ্যা দেখানো হবে না |
| SOS-11 | Directory ID | `ডিরেক্টরি → Hospital / Health`-এ একটি test entry যোগ করুন | record `directory/health`-এ থাকবে এবং Native App হাসপাতাল তালিকার key-এর সঙ্গে মিলবে; legacy `directory/hospital` অক্ষত থাকবে |
| SOS-12 | Canonical submit | `/service/emergency` route খোলুন | unruled `service_requests/emergency`-এ data read/write না করে canonical `/emergency` SOS form খুলবে |
| SOS-13 | Admin authorization/actor | সাধারণ user account দিয়ে Admin decision চেষ্টা করুন; Admin দিয়ে `updatedAt`/`updatedBy` ছাড়া write চেষ্টা করুন | Admin claim gate ও Firebase Rules update প্রত্যাখ্যান করবে; প্রত্যেক বিদ্যমান alert update-এ বর্তমান Admin UID ও timestamp বাধ্যতামূলক |
| SOS-14 | Public privacy/deletion | নিজের public test alert-এ `phone`, `phoneNumber`, `requesterName`, `email`, `gps` বা `coordinates` field যোগের চেষ্টা করুন; বিদ্যমান alert delete-ও চেষ্টা করুন | sensitive aliases validation-এ reject হবে এবং alert record delete হবে না |

**Deployment note:** Admin UI push এবং Firebase RTDB Rules deployment আলাদা। Rules update-এর আগে live Rules-এর পূর্ণ backup নিন; repo-এর `database.rules.json`-এর সঙ্গে diff/merge করে emergency lifecycle, privacy ও actor/time clauses যাচাই করুন, তারপর Emulator suite চালিয়ে publish করুন। RTDB Rules sibling-path audit event enforce করতে পারে না; direct Admin SDK update এড়িয়ে শুধু audited Admin Panel action ব্যবহার করুন। Browser/OS push notification এখানে নেই; real-time Admin queue দেখতে panel খোলা থাকতে হবে।
