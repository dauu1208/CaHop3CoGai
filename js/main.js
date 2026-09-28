/* Ba Cô Nấu Ăn — interact cho index.html và member.html */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STORE = "cast"; // sessionStorage: 'open' khi đang hiện 3 cô

  /* ---------- 1) PARALLAX + XẾP CHỒNG GIỮA CÁC VIEWPORT ----------
     a) Xếp chồng ("cuốn chiếu"): mỗi viewport dính lại khi cuộn hết, viewport kế tiếp trượt đè lên;
        viewport bên dưới co nhỏ + tối dần, viewport mới bo góc rồi mở phẳng ra.
        JS chỉ ghi các biến CSS vào từng <section>:
          --cover  0→1  mức bị viewport sau đè lên
          --e      0→1  mức đã "vào" màn hình (dùng cho hiệu ứng trượt/xoay khi xuất hiện)
          --r      0→1  độ bo góc
     b) .px = parallax từng lớp. Mỗi phần tử có --speed, dịch theo khoảng cách tới tâm màn hình.
        Dùng thuộc tính `translate` (không phải transform) để không đè hiệu ứng khác. */
  var isMember = document.body.classList.contains("member");
  var stack = isMember
    ? []
    : [].slice.call(document.querySelectorAll("body > section, body > footer"));
  var useStack = stack.length > 1 && !reduce;
  var nat = [],
    hs = [];
  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }

  function measure() {
    var vh = window.innerHeight,
      acc = 0;
    stack.forEach(function (el, i) {
      var h = el.offsetHeight;
      nat[i] = acc;
      hs[i] = h;
      acc += h;
      if (useStack && el.tagName === "SECTION")
        el.style.top = Math.min(0, vh - h) + "px"; // dính khi đáy chạm đáy màn hình
    });
  }
  if (useStack) {
    document.documentElement.classList.add("stack");
    stack.forEach(function (el, i) {
      el.style.zIndex = i + 1;
    });
    measure();
    window.addEventListener("load", measure);
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(function () {
        measure();
        onScroll();
      });
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () {
        measure();
        onScroll();
      });
      stack.forEach(function (el) {
        ro.observe(el);
      });
    }
  }

  var px = [].slice.call(document.querySelectorAll(".px")).map(function (el) {
    var box = el.closest("section, main") || document.body;
    return {
      el: el,
      box: box,
      i: stack.indexOf(box),
      speed: parseFloat(getComputedStyle(el).getPropertyValue("--speed")) || 0,
    };
  });
  var ticking = false;
  function paint() {
    ticking = false;
    var vh = window.innerHeight,
      y = window.scrollY,
      mid = vh / 2;

    if (useStack) {
      stack.forEach(function (el, i) {
        if (el.tagName !== "SECTION") return;
        var q = (nat[i] - y) / vh; // 1: vừa lộ ở đáy … 0: chạm đỉnh
        var enter = clamp(1 - q, 0, 1);
        var nextQ = i + 1 < stack.length ? (nat[i + 1] - y) / vh : 1;
        var cover = clamp(1 - nextQ, 0, 1); // viewport sau đã đè bao nhiêu
        el.style.setProperty("--cover", cover.toFixed(3));
        el.style.setProperty("--e", clamp(enter * 1.35, 0, 1).toFixed(3));
        el.style.setProperty("--r", Math.max(clamp(q, 0, 1), cover).toFixed(3));
      });
    }

    px.forEach(function (p) {
      var top, height;
      if (p.i > -1) {
        top = nat[p.i] - y;
        height = hs[p.i];
      } // vị trí "ảo" (kể cả khi section đang dính)
      else {
        var r = p.box.getBoundingClientRect();
        top = r.top;
        height = r.height;
      }
      if (top + height < -200 || top > vh + 200) return; // ngoài màn hình thì bỏ qua
      var d = (mid - (top + height / 2)) * p.speed;
      p.el.style.translate = "0 " + d.toFixed(1) + "px";
    });
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(paint);
    }
  }
  if (!reduce && (px.length || useStack)) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      if (useStack) measure();
      onScroll();
    });
    paint();
  }

  /* ---------- 2) HOME: MỞ / ĐÓNG LON ---------- */
  var hero = document.getElementById("hero");
  if (hero) {
    var can = hero.querySelector(".can");
    var closeBtn = hero.querySelector(".cast__close");
    var firstLink = hero.querySelector(".lady .btn");

    var closingTimer;
    function setOpen(open, opts) {
      opts = opts || {};
      if (opts.instant) {
        // khôi phục / thu về khi đang ở ngoài màn hình: không chạy animation
        hero.classList.add("is-restored");
        void hero.offsetWidth;
      }
      // Thu về lon: chạy ngược hiệu ứng sốt tràn (.is-closing), tự gỡ sau khi xong
      clearTimeout(closingTimer);
      if (open) {
        hero.classList.remove("is-closing");
      } else if (!opts.instant && hero.classList.contains("is-open")) {
        hero.classList.add("is-closing");
        closingTimer = setTimeout(function () {
          hero.classList.remove("is-closing");
        }, 1300);
      } else {
        hero.classList.remove("is-closing");
      }
      hero.classList.toggle("is-open", open);
      hero.classList.toggle("is-closed", !open);
      can.setAttribute("aria-expanded", String(open));
      try {
        open
          ? sessionStorage.setItem(STORE, "open")
          : sessionStorage.removeItem(STORE);
      } catch (e) {}
      if (opts.instant) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            hero.classList.remove("is-restored");
          });
        });
      }
      if (open && !opts.instant)
        setTimeout(function () {
          firstLink && firstLink.focus({ preventScroll: true });
        }, 1000);
      if (!open && !opts.instant) can.focus({ preventScroll: true });
    }

    can.addEventListener("click", function () {
      setOpen(true);
    });
    closeBtn.addEventListener("click", function () {
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && hero.classList.contains("is-open"))
        setOpen(false);
    });

    // Bấm ra ngoài (khoảng trống trong hero, hoặc bất kỳ viewport nào khác) => thu 3 cô về lại lon.
    // Bấm vào thẻ 3 cô, nút "Đóng lon", tiêu đề thì giữ nguyên.
    document.addEventListener("click", function (e) {
      if (!hero.classList.contains("is-open")) return;
      if (e.target.closest(".lady, .cast__close, .cast__title, .can")) return;
      var heroInView = window.scrollY < window.innerHeight * 0.5; // hero còn ở màn hình đầu (hero có thể đang bị các viewport sau đè lên)
      // đang ở viewport khác: thu ngầm (không animation) để lúc cuộn lên thấy lon đã đóng sẵn
      setOpen(false, { instant: !heroInView });
    });

    // Quay lại từ member.html (hoặc F5): tự mở sẵn 3 cô
    var wasOpen = false;
    try {
      wasOpen = sessionStorage.getItem(STORE) === "open";
    } catch (e) {}
    if (wasOpen || location.hash === "#cast") {
      setOpen(true, { instant: true });
      window.scrollTo(0, 0);
    }
  }

  /* ---------- 3) DỰ ÁN: VẼ TIMELINE KHI CUỘN TỚI ---------- */
  var projs = document.querySelectorAll(".proj");
  if (projs.length) {
    if (!("IntersectionObserver" in window) || reduce) {
      projs.forEach(function (s) {
        s.classList.add("is-in");
      });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("is-in");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.35 },
      );
      projs.forEach(function (s) {
        io.observe(s);
      });
    }
  }

  /* ---------- 4) TRANG THÀNH VIÊN ---------- */
  if (document.body.classList.contains("member")) {
    var EDU_END = "Trường Đại học Khoa học Tự nhiên (2024 – Hiện tại)";
    var MEMBERS = {
      thu: {
        n: "Huỳnh Anh Thư",
        bg: "ANH THƯ",
        init: "AT",
        idx: 1,
        role: "Sinh viên năm 3 | Kỹ thuật Phần mềm",
        major: "Kỹ thuật Phần mềm",
        bio: "Lập trình và phát triển hệ thống, cùng sự yêu thích đối với việc tìm hiểu và ứng dụng những công nghệ mới. Các dự án thực tế là cơ hội để nâng cao kỹ năng chuyên môn và khả năng làm việc trong môi trường nhóm.",
        skills: ["Thành thạo tin học văn phòng", "IELTS 7.0"],
        edu: ["Trường THPT Chuyên Thoại Ngọc Hầu (2021 – 2024)", EDU_END],
      },
      minh: {
        n: "Nguyễn Ngọc Minh",
        bg: "NGỌC MINH",
        init: "NM",
        idx: 2,
        role: "Sinh viên năm 3 | Hệ thống thông tin",
        major: "Hệ thống thông tin",
        bio: "Quan tâm đến sự kết nối giữa công nghệ, dữ liệu và nhu cầu của người dùng hoặc doanh nghiệp. Định hướng hiện tại tập trung vào phân tích, hệ thống và dữ liệu, với mục tiêu tạo ra những giải pháp vừa phù hợp về mặt công nghệ vừa đáp ứng được nhu cầu thực tế.",
        skills: ["Thành thạo tin học văn phòng", "IELTS 7.0"],
        edu: ["Trường THPT Nguyễn Đình Chiểu (2021 – 2024)", EDU_END],
      },
      bang: {
        n: "Mai Khánh Băng",
        bg: "KHÁNH BĂNG",
        init: "KB",
        idx: 3,
        role: "Sinh viên năm 3 | Kỹ thuật Phần mềm",
        major: "Kỹ thuật Phần mềm",
        bio: "Quan tâm đến phát triển phần mềm và xây dựng các sản phẩm có tính ứng dụng. Trong quá trình học tập, tập trung phát triển kỹ năng lập trình, tư duy giải quyết vấn đề và khả năng biến ý tưởng thành những sản phẩm cụ thể.",
        skills: ["Thành thạo tin học văn phòng", "IELTS 7.0", "HSK 5"],
        edu: ["Trường THPT Nguyễn Thượng Hiền (2021 – 2024)", EDU_END],
      },
    };
    var key = new URLSearchParams(location.search).get("m");
    var m = MEMBERS[key] || MEMBERS.thu;
    key = MEMBERS[key] ? key : "thu";
    document.body.dataset.m = key;
    document.title = m.n + " — Cá Hộp 3 Cô Gái";

    var $ = function (s) {
      return document.querySelector(s);
    };
    $(".m-bg").textContent = m.bg;
    $("[data-f=idx]").textContent = "Thành viên " + m.idx + " trên 3";
    $("[data-f=name]").textContent = m.n;
    $("[data-f=role]").textContent = m.role;
    $("[data-f=bio]").textContent = m.bio;
    $("[data-f=major]").textContent = m.major;
    $("[data-f=init]").textContent = m.init;
    var skills = $("[data-f=skills]");
    skills.textContent = "";
    m.skills.forEach(function (t) {
      var s = document.createElement("span");
      s.textContent = t;
      skills.appendChild(s);
    });
    var ul = $("[data-f=edu]");
    ul.textContent = "";
    m.edu.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });

    // Ảnh thành viên: đặt file images/members/<thu|minh|bang>.jpg, không có thì hiện chữ cái viết tắt
    var photo = $(".m-photo"),
      img = new Image();
    img.alt = m.n;
    img.onload = function () {
      photo.appendChild(img);
    };
    img.src = "images/members/" + key + ".jpg";

    // Nút Back: đánh dấu "đang hiện 3 cô" rồi về home; có lịch sử thì history.back() để giữ vị trí
    try {
      sessionStorage.setItem(STORE, "open");
    } catch (e) {}
    $(".back").addEventListener("click", function (e) {
      if (
        document.referrer &&
        new URL(document.referrer).pathname.indexOf("index") !== -1 &&
        history.length > 1
      ) {
        e.preventDefault();
        history.back();
      }
    });
  }
})();
