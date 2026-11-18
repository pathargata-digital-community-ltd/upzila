export function createCommunitySubmissionAdmin({
  db,
  auth,
  ref,
  push,
  get,
  update,
  onValue,
  query,
  orderByChild,
  limitToLast,
}) {
  let tourismRequests = {};
  let providerApplications = {};
  let transportRequests = {};
  const errors = { tourism: "", providers: "", transport: "" };
  const busy = new Set();
  let unsubscribers = [];

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[char]);
  const stamp = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "সময় উল্লেখ নেই";
    try { return new Date(number).toLocaleString("bn-BD"); } catch { return new Date(number).toLocaleString(); }
  };
  const objectRows = (value) => value && typeof value === "object"
    ? Object.entries(value).filter(([, item]) => item && typeof item === "object").sort((a, b) => Number(b[1].timestamp || 0) - Number(a[1].timestamp || 0))
    : [];
  const isTourismPending = (item) => item?.moderationStatus === "pending" && ["open", "pending"].includes(String(item.status || "open"));
  const isPending = (item) => ["open", "pending"].includes(String(item?.status || ""));
  const typeLabels = { suggestion: "নতুন স্থান প্রস্তাব", correction: "স্থান সংশোধন", review: "ভ্রমণ রিভিউ", report: "তথ্য রিপোর্ট" };
  const providerLabels = { rent_a_car: "রেন্ট-এ-কার", cng: "CNG", auto_rickshaw: "Auto Rickshaw", motorcycle: "Motorcycle", bus: "বাস সার্ভিস" };
  const publicTransportPaths = { rent_a_car: "rent_a_car", cng: "cng", auto_rickshaw: "auto_rickshaw", motorcycle: "motorcycle", bus: "bus" };
  const categoryAllowlist = new Set(["nature", "history", "food_resort", "culture", "family", "all"]);

  function updateCount(id, count, label) {
    const node = document.getElementById(id);
    if (node) node.textContent = `${count} ${label}`;
  }
  function queueError(containerId, key) {
    const error = errors[key];
    if (!error) return false;
    const permission = /permission_denied|permission to access/i.test(error);
    const label = permission
      ? "Firebase Rules এই তালিকা পড়ার অনুমতি দেয়নি। Native-App-এর সম্পূর্ণ Realtime Database rules আপডেট করে প্রকাশিত আছে কি না যাচাই করুন।"
      : "তথ্য লোড হয়নি। ইন্টারনেট, Admin claim এবং Firebase Rules যাচাই করে আবার চেষ্টা করুন।";
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = `<div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>${escapeHTML(label)}</p><p class="mt-2 break-all text-xs text-red-700">${escapeHTML(error)}</p><button type="button" data-community-retry="true" class="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-800"><i class="fa-solid fa-rotate-right mr-1"></i>আবার চেষ্টা করুন</button></div>`;
    return true;
  }
  function statusLabel(status) {
    return ({
      open: "অপেক্ষমাণ", pending: "অপেক্ষমাণ", approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত",
      resolved: "নিষ্পত্তি হয়েছে", closed: "বন্ধ",
    })[String(status || "")] || String(status || "অজানা");
  }
  function bindList(containerId, queueType) {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.handlersBound === "true") return;
    container.dataset.handlersBound = "true";
    container.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-community-action], [data-community-retry]") : null;
      if (!target) return;
      if (target.hasAttribute("data-community-retry")) { start(); return; }
      const id = target.getAttribute("data-id");
      const action = target.getAttribute("data-community-action");
      if (!id || !action) return;
      if (queueType === "tourism") void decideTourism(id, action);
      else if (queueType === "providers") void decideProvider(id, action);
      else void decideTransportRequest(id, action);
    });
  }
  function button(action, id, label, color, disabled) {
    return `<button type="button" data-community-action="${escapeHTML(action)}" data-id="${escapeHTML(id)}" ${disabled ? "disabled" : ""} class="rounded-lg ${color} px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">${escapeHTML(label)}</button>`;
  }
  function renderTourism() {
    const list = document.getElementById("list-tourism-submissions");
    if (!list) return;
    bindList("list-tourism-submissions", "tourism");
    if (queueError("list-tourism-submissions", "tourism")) return;
    const rows = objectRows(tourismRequests);
    const pending = rows.filter(([, item]) => isTourismPending(item));
    updateCount("count-tourism-submissions", pending.length, "অপেক্ষমাণ");
    if (!rows.length) {
      list.innerHTML = '<div class="rounded-xl border border-dashed p-5 text-center text-sm text-gray-500">এখনো কোনো পর্যটন আবেদন নেই।</div>';
      return;
    }
    list.innerHTML = rows.slice(0, 80).map(([id, item]) => {
      const actionKey = `tourism:${id}`;
      const pendingItem = isTourismPending(item);
      const busyAction = busy.has(actionKey);
      const kind = String(item.requestType || "");
      const publishLabel = kind === "report" ? "রিপোর্ট নিষ্পত্তি" : kind === "review" ? "রিভিউ প্রকাশ" : "অনুমোদন ও প্রকাশ";
      const fields = [
        item.address && `ঠিকানা: ${item.address}`,
        item.locality && `এলাকা: ${item.locality}`,
        item.phone && `ফোন: ${item.phone}`,
        item.openingHours && `সময়: ${item.openingHours}`,
        item.admissionFee && `প্রবেশ/খরচ: ${item.admissionFee}`,
        item.estimatedDuration && `সময় লাগবে: ${item.estimatedDuration}`,
        item.rating && `রেটিং: ${item.rating}/5`,
      ].filter(Boolean).map(escapeHTML).join(" · ");
      return `<article class="rounded-xl border border-gray-200 bg-white p-4"><div class="flex flex-wrap items-start justify-between gap-2"><div><span class="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-800">${escapeHTML(typeLabels[kind] || "পর্যটন আবেদন")}</span><span class="ml-2 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">${escapeHTML(statusLabel(item.status))}</span></div><span class="text-[11px] text-gray-400">${escapeHTML(stamp(item.timestamp))}</span></div><h4 class="mt-3 font-bold text-gray-900">${escapeHTML(item.title || "শিরোনাম নেই")}</h4>${item.category ? `<p class="mt-1 text-xs text-violet-700">বিভাগ: ${escapeHTML(item.category)}</p>` : ""}<p class="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-gray-700">${escapeHTML(item.details || "বিস্তারিত নেই")}</p>${fields ? `<p class="mt-2 text-xs leading-5 text-gray-600">${fields}</p>` : ""}${item.placeId ? `<p class="mt-2 break-all font-mono text-[11px] text-gray-400">Place ID: ${escapeHTML(item.placeId)}</p>` : ""}<p class="mt-2 text-[11px] text-gray-400">জমাদাতা: ${escapeHTML(item.author || "নাম নেই")} · UID: ${escapeHTML(item.uid || "নেই")}</p>${pendingItem ? `<div class="mt-3 flex flex-wrap gap-2 border-t pt-3">${button("approve", id, busyAction ? "প্রক্রিয়াধীন…" : publishLabel, "bg-emerald-700 hover:bg-emerald-800", busyAction)}${button("reject", id, "প্রত্যাখ্যান", "bg-red-700 hover:bg-red-800", busyAction)}</div>` : ""}</article>`;
    }).join("");
  }
  function renderProviders() {
    const list = document.getElementById("list-transport-provider-submissions");
    if (!list) return;
    bindList("list-transport-provider-submissions", "providers");
    if (queueError("list-transport-provider-submissions", "providers")) return;
    const rows = objectRows(providerApplications);
    const pending = rows.filter(([, item]) => isPending(item));
    updateCount("count-transport-provider-submissions", pending.length, "অপেক্ষমাণ");
    if (!rows.length) {
      list.innerHTML = '<div class="rounded-xl border border-dashed p-5 text-center text-sm text-gray-500">এখনো কোনো provider আবেদন নেই।</div>';
      return;
    }
    list.innerHTML = rows.slice(0, 80).map(([id, item]) => {
      const busyAction = busy.has(`provider:${id}`);
      const detailRows = [
        item.phone && `ফোন: ${item.phone}`,
        item.whatsapp && `WhatsApp: ${item.whatsapp}`,
        item.serviceArea && `সেবা এলাকা/রুট: ${item.serviceArea}`,
        item.vehicleInfo && `যানবাহন: ${item.vehicleInfo}`,
        item.fare && `ভাড়া: ${item.fare}`,
      ].filter(Boolean).map(escapeHTML).join(" · ");
      return `<article class="rounded-xl border border-gray-200 bg-white p-4"><div class="flex flex-wrap items-start justify-between gap-2"><div><span class="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">${escapeHTML(providerLabels[item.providerType] || item.providerTypeLabel || "পরিবহন provider")}</span><span class="ml-2 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">${escapeHTML(statusLabel(item.status))}</span></div><span class="text-[11px] text-gray-400">${escapeHTML(stamp(item.timestamp))}</span></div><h4 class="mt-3 font-bold text-gray-900">${escapeHTML(item.providerName || "নাম নেই")}</h4><p class="mt-2 text-xs leading-5 text-gray-600">${detailRows || "যোগাযোগ/সেবা তথ্য নেই"}</p><p class="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-gray-700">${escapeHTML(item.details || "বিস্তারিত নেই")}</p><p class="mt-2 text-[11px] text-gray-400">জমাদাতা: ${escapeHTML(item.author || "নাম নেই")} · UID: ${escapeHTML(item.uid || "নেই")}</p>${isPending(item) ? `<div class="mt-3 flex flex-wrap gap-2 border-t pt-3">${button("approve", id, busyAction ? "প্রক্রিয়াধীন…" : "অনুমোদন ও directory-তে যোগ", "bg-emerald-700 hover:bg-emerald-800", busyAction)}${button("reject", id, "প্রত্যাখ্যান", "bg-red-700 hover:bg-red-800", busyAction)}</div>` : ""}</article>`;
    }).join("");
  }
  function renderTransportRequests() {
    const list = document.getElementById("list-transport-requests");
    if (!list) return;
    bindList("list-transport-requests", "transport");
    if (queueError("list-transport-requests", "transport")) return;
    const rows = objectRows(transportRequests);
    const pending = rows.filter(([, item]) => isPending(item));
    updateCount("count-transport-requests", pending.length, "অপেক্ষমাণ");
    if (!rows.length) {
      list.innerHTML = '<div class="rounded-xl border border-dashed p-5 text-center text-sm text-gray-500">এখনো কোনো পরিবহন request নেই।</div>';
      return;
    }
    list.innerHTML = rows.slice(0, 80).map(([id, item]) => {
      const busyAction = busy.has(`transport:${id}`);
      return `<article class="rounded-xl border border-gray-200 bg-white p-4"><div class="flex flex-wrap items-start justify-between gap-2"><span class="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">পরিবহন request · ${escapeHTML(statusLabel(item.status))}</span><span class="text-[11px] text-gray-400">${escapeHTML(stamp(item.timestamp))}</span></div><h4 class="mt-3 font-bold text-gray-900">${escapeHTML(item.title || "শিরোনাম নেই")}</h4><p class="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-gray-700">${escapeHTML(item.details || "বিস্তারিত নেই")}</p><p class="mt-2 text-xs text-gray-600">ফোন: ${escapeHTML(item.phone || "নেই")}</p><p class="mt-2 text-[11px] text-gray-400">জমাদাতা: ${escapeHTML(item.author || "নাম নেই")} · UID: ${escapeHTML(item.uid || "নেই")}</p>${isPending(item) ? `<div class="mt-3 flex flex-wrap gap-2 border-t pt-3">${button("resolve", id, busyAction ? "প্রক্রিয়াধীন…" : "নিষ্পত্তি হয়েছে", "bg-emerald-700 hover:bg-emerald-800", busyAction)}${button("reject", id, "প্রত্যাখ্যান", "bg-red-700 hover:bg-red-800", busyAction)}</div>` : ""}</article>`;
    }).join("");
  }
  function render() {
    renderTourism();
    renderProviders();
    renderTransportRequests();
    const pendingCount = objectRows(tourismRequests).filter(([, item]) => isTourismPending(item)).length
      + objectRows(providerApplications).filter(([, item]) => isPending(item)).length
      + objectRows(transportRequests).filter(([, item]) => isPending(item)).length;
    const badge = document.getElementById("badge-community-submissions");
    if (badge) {
      badge.textContent = String(pendingCount);
      badge.classList.toggle("hidden", pendingCount === 0);
    }
  }
  function start() {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [];
    errors.tourism = "";
    errors.providers = "";
    errors.transport = "";
    render();
    const sources = [
      { key: "tourism", path: "service_requests/tourism", assign: (value) => { tourismRequests = value; } },
      { key: "providers", path: "transport_provider_requests", assign: (value) => { providerApplications = value; } },
      { key: "transport", path: "service_requests/transport", assign: (value) => { transportRequests = value; } },
    ];
    for (const source of sources) {
      const listener = onValue(
        query(ref(db, source.path), orderByChild("timestamp"), limitToLast(200)),
        (snapshot) => {
          source.assign(snapshot.val() || {});
          errors[source.key] = "";
          render();
        },
        (error) => {
          console.error(`Cannot read ${source.path}`, error);
          source.assign({});
          errors[source.key] = `${error.code || "Firebase error"}: ${error.message || "read denied"}`;
          render();
        },
      );
      unsubscribers.push(listener);
    }
  }
  async function adminUser() {
    const user = auth.currentUser;
    if (!user) throw new Error("Admin session নেই—আবার লগইন করুন।");
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true) throw new Error("Firebase admin custom claim যাচাই হয়নি।");
    return user;
  }
  function auditUpdate(user, action, target, before, after, result, timestamp) {
    const auditRef = push(ref(db, "super_admin_audit"));
    if (!auditRef.key) throw new Error("Audit event ID তৈরি করা যায়নি।");
    const clip = (value) => JSON.stringify(value ?? null).slice(0, 3900);
    return {
      [`super_admin_audit/${auditRef.key}`]: {
        actorUid: user.uid,
        action: String(action).slice(0, 80),
        target: String(target).slice(0, 256),
        before: clip(before),
        after: clip(after),
        reason: "Tourism and transport submission review",
        requestId: `${action}-${timestamp}-${auditRef.key}`.slice(0, 128),
        timestamp,
        result,
      },
    };
  }
  function baseReviewUpdates(kind, id, request, status, moderationStatus, user, timestamp, publicRecordId) {
    const path = kind === "tourism" ? `service_requests/tourism/${id}` : kind === "provider" ? `transport_provider_requests/${id}` : `service_requests/transport/${id}`;
    const updates = {
      [`${path}/status`]: status,
      [`${path}/reviewedAt`]: timestamp,
      [`${path}/reviewedBy`]: user.uid,
    };
    if (moderationStatus) updates[`${path}/moderationStatus`] = moderationStatus;
    if (publicRecordId) updates[`${path}/publicRecordId`] = publicRecordId;
    const outcome = status === "rejected" ? "rejected" : status === "resolved" ? "resolved" : "approved";
    Object.assign(updates, auditUpdate(
      user,
      `community_${kind}_${outcome}`,
      path,
      { status: request.status, moderationStatus: request.moderationStatus || null, requestType: request.requestType || null },
      { status, moderationStatus: moderationStatus || null, publicRecordId: publicRecordId || null },
      outcome === "resolved" ? "success" : outcome,
      timestamp,
    ));
    return updates;
  }
  async function decideTourism(id, decision) {
    const busyKey = `tourism:${id}`;
    if (busy.has(busyKey)) return;
    const cached = tourismRequests[id];
    if (!cached || !isTourismPending(cached)) return window.alert("এই আবেদনটি আর অপেক্ষমাণ নেই। তালিকা refresh করুন।");
    const kind = String(cached.requestType || "");
    const verb = decision === "reject" ? "প্রত্যাখ্যান" : kind === "report" ? "রিপোর্ট নিষ্পত্তি" : kind === "review" ? "রিভিউ প্রকাশ" : "অনুমোদন করে Tourism তালিকায় প্রকাশ";
    if (!window.confirm(`${cached.title || "এই Tourism আবেদন"} — ${verb} করবেন?`)) return;
    busy.add(busyKey); render();
    try {
      const user = await adminUser();
      const snapshot = await get(ref(db, `service_requests/tourism/${id}`));
      const request = snapshot.val();
      if (!request || !isTourismPending(request)) throw new Error("আবেদনটি ইতিমধ্যে অন্য Admin পর্যালোচনা করেছেন।");
      const now = Date.now();
      let updates;
      if (decision === "reject") {
        updates = baseReviewUpdates("tourism", id, request, "rejected", "rejected", user, now);
      } else if (kind === "report") {
        updates = baseReviewUpdates("tourism", id, request, "resolved", "approved", user, now);
      } else if (kind === "suggestion") {
        const publicId = `community-${id}`;
        const images = Array.isArray(request.images) ? request.images : request.images && typeof request.images === "object" ? Object.values(request.images) : [];
        const safeImages = images.filter((image) => typeof image === "string" && /^https:\/\/res\.cloudinary\.com\//i.test(image)).slice(0, 3);
        const category = categoryAllowlist.has(String(request.category || "")) ? request.category : "all";
        const record = {
          title: String(request.title || "").trim(),
          details: String(request.details || "").trim(),
          category,
          address: String(request.address || "").trim(),
          locality: String(request.locality || "").trim(),
          phone: String(request.phone || "").trim(),
          openingHours: String(request.openingHours || "").trim(),
          admissionFee: String(request.admissionFee || "").trim(),
          estimatedDuration: String(request.estimatedDuration || "").trim(),
          updatedAt: now,
          is_verified: true,
          sourceRequestId: id,
        };
        if (safeImages.length) { record.images = safeImages; record.image = safeImages[0]; }
        updates = baseReviewUpdates("tourism", id, request, "approved", "approved", user, now, publicId);
        updates[`services/data/history_tourism/${publicId}`] = record;
      } else if (kind === "correction") {
        const placeId = String(request.placeId || "");
        if (!placeId || [".", "#", "$", "[", "]", "/"].some((char) => placeId.includes(char))) throw new Error("সংশোধনের জন্য বৈধ Place ID পাওয়া যায়নি।");
        const publicPath = `services/data/history_tourism/${placeId}`;
        const placeSnapshot = await get(ref(db, publicPath));
        const existing = placeSnapshot.val();
        if (!existing || typeof existing !== "object") throw new Error("এই place আর Tourism তালিকায় নেই; আগে সেটি যাচাই করুন।");
        const submittedDetails = String(request.details || "").replace(/^সংশোধনের অনুরোধ:[^\n]*(?:\n|$)/, "").trim();
        const patch = { updatedAt: now, is_verified: true, sourceRequestId: id };
        for (const field of ["title", "category", "address", "locality", "phone", "openingHours", "admissionFee", "estimatedDuration"]) {
          const value = String(request[field] || "").trim();
          if (value) patch[field] = field === "category" && !categoryAllowlist.has(value) ? "all" : value;
        }
        if (submittedDetails) patch.details = submittedDetails;
        if (Array.isArray(request.images) && request.images.length) patch.images = request.images.slice(0, 3);
        updates = baseReviewUpdates("tourism", id, request, "approved", "approved", user, now, placeId);
        for (const [field, value] of Object.entries(patch)) updates[`${publicPath}/${field}`] = value;
      } else if (kind === "review") {
        const placeId = String(request.placeId || "");
        if (!placeId || [".", "#", "$", "[", "]", "/"].some((char) => placeId.includes(char))) throw new Error("রিভিউ প্রকাশের জন্য বৈধ Place ID নেই।");
        const publicPath = `services/data/history_tourism/${placeId}`;
        const placeSnapshot = await get(ref(db, publicPath));
        const existing = placeSnapshot.val();
        const rating = Number(request.rating);
        if (!existing || typeof existing !== "object") throw new Error("রিভিউয়ের place আর Tourism তালিকায় নেই।");
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("রিভিউয়ের rating ১ থেকে ৫-এর মধ্যে হতে হবে।");
        const reviewId = `community-${id}`;
        const sourceReviews = existing.approvedReviews ?? existing.approved_reviews ?? existing.reviews ?? {};
        const reviewEntries = Array.isArray(sourceReviews) ? sourceReviews.map((item, index) => [String(index), item]) : Object.entries(sourceReviews && typeof sourceReviews === "object" ? sourceReviews : {});
        if (reviewEntries.some(([entryId]) => entryId === reviewId)) throw new Error("এই আবেদনটির রিভিউ ইতিমধ্যে প্রকাশিত। তালিকা refresh করুন।");
        const existingCount = Number(existing.reviewCount ?? existing.review_count ?? existing.total_reviews);
        const existingAverage = Number(existing.averageRating ?? existing.average_rating ?? existing.rating);
        const count = Number.isFinite(existingCount) && existingCount >= 0 ? existingCount : reviewEntries.length;
        const avg = Number.isFinite(existingAverage) && existingAverage >= 1 && existingAverage <= 5 ? existingAverage : (reviewEntries.length ? reviewEntries.reduce((sum, [, entry]) => sum + (Number(entry?.rating || 0) || 0), 0) / reviewEntries.length : 0);
        const approvedReview = { author: String(request.author || "কমিউনিটি সদস্য").slice(0, 160), rating, comment: String(request.details || "").slice(0, 1000), timestamp: Number(request.timestamp) || now, status: "approved" };
        updates = baseReviewUpdates("tourism", id, request, "approved", "approved", user, now, placeId);
        updates[`${publicPath}/approvedReviews/${reviewId}`] = approvedReview;
        updates[`${publicPath}/reviewCount`] = count + 1;
        updates[`${publicPath}/averageRating`] = Number((((avg * count) + rating) / (count + 1)).toFixed(2));
        updates[`${publicPath}/updatedAt`] = now;
      } else {
        throw new Error("এই ধরনের Tourism আবেদন অনুমোদন করা যাচ্ছে না।");
      }
      await update(ref(db), updates);
      window.alert(decision === "reject" ? "Tourism আবেদনটি প্রত্যাখ্যান করা হয়েছে।" : kind === "report" ? "Tourism রিপোর্ট নিষ্পত্তি হয়েছে।" : "Tourism তথ্য অনুমোদিত হয়ে Native App-এর তালিকায় যুক্ত হয়েছে।");
    } catch (error) {
      console.error("Tourism submission review failed:", error);
      window.alert(`Tourism সিদ্ধান্ত সংরক্ষণ হয়নি: ${error?.message || "Firebase Rules/connection পরীক্ষা করুন।"}`);
    } finally {
      busy.delete(busyKey); render();
    }
  }
  async function decideProvider(id, decision) {
    const busyKey = `provider:${id}`;
    if (busy.has(busyKey)) return;
    const cached = providerApplications[id];
    if (!cached || !isPending(cached)) return window.alert("এই provider আবেদনটি আর অপেক্ষমাণ নেই। তালিকা refresh করুন।");
    const label = providerLabels[cached.providerType] || cached.providerTypeLabel || "পরিবহন provider";
    const verb = decision === "approve" ? "অনুমোদন করে public Transport directory-তে যোগ" : "প্রত্যাখ্যান";
    if (!window.confirm(`${cached.providerName || label} — ${verb} করবেন? অনুমোদনে ফোন ও service area public হবে।`)) return;
    busy.add(busyKey); render();
    try {
      const user = await adminUser();
      const snapshot = await get(ref(db, `transport_provider_requests/${id}`));
      const request = snapshot.val();
      if (!request || request.status !== "pending") throw new Error("আবেদনটি ইতিমধ্যে অন্য Admin পর্যালোচনা করেছেন।");
      const now = Date.now();
      let updates;
      if (decision === "reject") {
        updates = baseReviewUpdates("provider", id, request, "rejected", null, user, now);
      } else {
        const directoryPath = publicTransportPaths[request.providerType];
        if (!directoryPath) throw new Error("অনুমোদিত নয় এমন provider type পাওয়া গেছে।");
        const publicId = `provider-${id}`;
        const publicRecord = {
          name: String(request.providerName || "").trim(),
          providerName: String(request.providerName || "").trim(),
          driverName: String(request.providerName || "").trim(),
          vehicleType: label,
          serviceArea: String(request.serviceArea || "").trim(),
          route: String(request.serviceArea || "").trim(),
          phone: String(request.phone || "").trim(),
          whatsapp: String(request.whatsapp || "").trim(),
          vehicleInfo: String(request.vehicleInfo || "").trim(),
          details: String(request.details || "").trim(),
          fare: String(request.fare || "").trim(),
          availability: "সেবা পাওয়া যায়",
          available: true,
          verified: true,
          isVerified: true,
          status: "approved",
          updatedAt: now,
          sourceApplicationId: id,
        };
        if (request.providerType === "bus") publicRecord.counterName = publicRecord.serviceArea;
        if (request.providerType === "rent_a_car") { publicRecord.carModel = publicRecord.vehicleInfo; publicRecord.village = publicRecord.serviceArea; }
        updates = baseReviewUpdates("provider", id, request, "approved", null, user, now, publicId);
        updates[`transport/${directoryPath}/${publicId}`] = publicRecord;
      }
      await update(ref(db), updates);
      window.alert(decision === "approve" ? "Provider আবেদন অনুমোদিত—তথ্য Native App-এর পরিবহন directory-তে যুক্ত হয়েছে।" : "Provider আবেদন প্রত্যাখ্যান করা হয়েছে।");
    } catch (error) {
      console.error("Transport provider review failed:", error);
      window.alert(`Provider সিদ্ধান্ত সংরক্ষণ হয়নি: ${error?.message || "Firebase Rules/connection পরীক্ষা করুন।"}`);
    } finally {
      busy.delete(busyKey); render();
    }
  }
  async function decideTransportRequest(id, decision) {
    const busyKey = `transport:${id}`;
    if (busy.has(busyKey)) return;
    const cached = transportRequests[id];
    if (!cached || !isPending(cached)) return window.alert("এই পরিবহন request আর অপেক্ষমাণ নেই। তালিকা refresh করুন।");
    const finalStatus = decision === "reject" ? "rejected" : "resolved";
    if (!window.confirm(`“${cached.title || "পরিবহন request"}” ${finalStatus === "resolved" ? "নিষ্পত্তি" : "প্রত্যাখ্যান"} করবেন? এটি provider directory-তে যোগ হবে না।`)) return;
    busy.add(busyKey); render();
    try {
      const user = await adminUser();
      const snapshot = await get(ref(db, `service_requests/transport/${id}`));
      const request = snapshot.val();
      if (!request || !isPending(request)) throw new Error("Request ইতিমধ্যে অন্য Admin পর্যালোচনা করেছেন।");
      const now = Date.now();
      await update(ref(db), baseReviewUpdates("transport", id, request, finalStatus, null, user, now));
      window.alert(finalStatus === "resolved" ? "পরিবহন request নিষ্পত্তি হয়েছে।" : "পরিবহন request প্রত্যাখ্যান করা হয়েছে।");
    } catch (error) {
      console.error("Transport request review failed:", error);
      window.alert(`Transport request আপডেট হয়নি: ${error?.message || "Firebase Rules/connection পরীক্ষা করুন।"}`);
    } finally {
      busy.delete(busyKey); render();
    }
  }

  return { start, render };
}
