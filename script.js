const sky = document.getElementById("sky");
const totalEl = document.getElementById("total");
const sliceSelect = document.getElementById("slice");
const collectorsEl = document.getElementById("collectors");
const createEventBtn = document.getElementById("createEvent");
const eventNameInput = document.getElementById("eventName");
const eventColorInput = document.getElementById("eventColor");
const startHourSelect = document.getElementById('startHour');
const endHourSelect = document.getElementById('endHour');

let totalMinutes = 0;
let collectors = []; // {id, name, color, el, boxEl, minutes}
let activeCollectorId = null;

function createCollector(name = "时间收集器", color = "#ffb703", makeActive = false, startHour = null, endHour = null) {
  const id = `collector_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

  const wrapper = document.createElement("div");
  wrapper.className = "collector";

  const header = document.createElement("div");
  header.className = "collector-header";
  // header 分为左侧信息与右侧操作两组
  const leftGroup = document.createElement('div');
  leftGroup.className = 'collector-left';
  const rightGroup = document.createElement('div');
  rightGroup.className = 'collector-right';

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "activeCollector";
  radio.value = id;
  radio.id = `r_${id}`;
  radio.onclick = () => setActiveCollector(id);

  const title = document.createElement("label");
  title.htmlFor = `r_${id}`;
  title.className = "collector-title";
  title.innerHTML = `\u2B50 ${name}`;

  const swatch = document.createElement("span");
  swatch.className = "color-swatch";
  swatch.style.background = color;

  const rangeEl = document.createElement('div');
  rangeEl.className = 'collector-range';
  if (startHour !== null && endHour !== null) {
    rangeEl.innerText = `${String(startHour).padStart(2,'0')}:00 - ${String(endHour).padStart(2,'0')}:00`;
  } else rangeEl.innerText = '';

  const minutesEl = document.createElement('div');
  minutesEl.className = 'collector-minutes';
  minutesEl.innerText = '已: 0 分钟';
  const estimateEl = document.createElement('div');
  estimateEl.className = 'collector-estimate';
  estimateEl.innerText = '';

  const actions = document.createElement('div');
  actions.className = 'collector-actions';

  const renameBtn = document.createElement('button');
  renameBtn.className = 'collector-btn rename';
  renameBtn.title = '重命名';
  renameBtn.innerText = '✏️';
  renameBtn.setAttribute('aria-label','重命名');

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'collector-btn delete';
  deleteBtn.title = '删除';
  deleteBtn.innerText = '🗑️';
  deleteBtn.setAttribute('aria-label','删除');

  // 组织结构：左组放标识+标题+色块，右组放信息+动作+时间范围
  leftGroup.appendChild(radio);
  leftGroup.appendChild(title);
  leftGroup.appendChild(swatch);

  // header keeps leftGroup and range in rightGroup; actions move to footer
  rightGroup.appendChild(rangeEl);

  header.appendChild(leftGroup);
  header.appendChild(rightGroup);

  const box = document.createElement("div");
  box.className = "collector-box";
  box.dataset.collectorId = id;

  wrapper.appendChild(header);
  wrapper.appendChild(box);

  // 底部操作栏：放入收集器底部，按钮为图标
  const footer = document.createElement('div');
  footer.className = 'collector-footer';
  actions.appendChild(minutesEl);
  actions.appendChild(estimateEl);
  actions.appendChild(renameBtn);
  actions.appendChild(deleteBtn);
  footer.appendChild(actions);
  wrapper.appendChild(footer);

  collectorsEl.appendChild(wrapper);

  const collector = { id, name, color, el: wrapper, boxEl: box, minutes: 0, minutesEl, estimateEl, startHour, endHour };
  collectors.push(collector);

  if (makeActive || activeCollectorId === null) {
    radio.checked = true;
    setActiveCollector(id);
  }

  // 绑定重命名/删除等动作
  bindCollectorActions(collector);

  // 如果提供了时间范围，立即分配已有星星
  if (startHour !== null && endHour !== null) {
    assignStarsToCollector(collector);
  }

  return collector;
}

// 重命名与删除操作绑定（使用事件代理形式：每次创建收集器时绑定对应按钮）
function bindCollectorActions(collector) {
  const renameBtn = collector.el.querySelector('.collector-btn.rename');
  const deleteBtn = collector.el.querySelector('.collector-btn.delete');

  renameBtn.onclick = (e) => {
    e.stopPropagation();
    const newName = prompt('输入新的事件名称：', collector.name);
    if (newName === null) return;
    const name = newName.trim() || collector.name;
    collector.name = name;
    const label = collector.el.querySelector('.collector-title');
    label.innerText = `\u2B50 ${name}`;
  };

  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    if (!confirm(`确认删除事件：${collector.name} ?`)) return;

    // 从 collectors 中移除
    const idx = collectors.findIndex(c => c.id === collector.id);
    if (idx === -1) return;

    // 从总时间中减去该收集器已收集的分钟
    if (collector.minutes && collector.minutes > 0) {
      totalMinutes = Math.max(0, totalMinutes - collector.minutes);
      totalEl.innerText = totalMinutes;
    }

    // 移除 DOM
    // 先取消分配该 collector 的星星
    unassignStarsFromCollector(collector);
    collector.el.remove();
    collectors.splice(idx, 1);

    // 如果删除的是 active，则切换到第一个存在的 collector
    if (activeCollectorId === collector.id) {
      if (collectors.length > 0) setActiveCollector(collectors[0].id);
      else {
        // 若没有收集器，创建一个默认收集器
        const newC = createCollector('时间收集器', '#ffb703', true);
        bindCollectorActions(newC);
      }
    }
  };
}

function unassignStarsFromCollector(collector) {
  Array.from(sky.children).forEach(star => {
    if (star.dataset.assignedCollector === collector.id) {
      delete star.dataset.assignedCollector;
      star.classList.remove('assigned');
      star.style.boxShadow = '';
    }
  });
}

function setActiveCollector(id) {
  activeCollectorId = id;
  collectors.forEach(c => {
    if (c.id === id) c.el.classList.add("active"); else c.el.classList.remove("active");
  });
}

// 检查并把符合时间范围的星星分配到 collector
function assignStarsToCollector(collector) {
  const slice = Number(sliceSelect.value);
  const totalSlices = Math.floor((14 * 60) / slice);
  const dayStart = 8 * 60; // 08:00
  let assignedCount = 0;

  Array.from(sky.children).forEach(star => {
    const idx = Number(star.dataset.sliceIndex);
    if (Number.isNaN(idx)) return;
    const starMinute = dayStart + idx * slice; // start minute of slice

    const startMinute = collector.startHour !== null ? collector.startHour * 60 : null;
    const endMinute = collector.endHour !== null ? collector.endHour * 60 : null;

    if (startMinute !== null && endMinute !== null && starMinute >= startMinute && starMinute < endMinute) {
      // assign
      star.dataset.assignedCollector = collector.id;
      star.classList.add('assigned');
      // light tint using collector color
      star.style.boxShadow = `0 0 6px ${collector.color}, 0 0 12px ${shadeColor(collector.color, -40)}`;
      assignedCount++;
    } else {
      if (star.dataset.assignedCollector === collector.id) {
        delete star.dataset.assignedCollector;
        star.classList.remove('assigned');
        star.style.boxShadow = '';
      }
    }
  });

  const est = assignedCount * slice;
  collector.estimated = est;
  collector.estimateEl.innerText = `预: ${est} 分钟`;
}

function assignStarsToAllCollectors() {
  collectors.forEach(c => {
    if (c.startHour !== null && c.endHour !== null) assignStarsToCollector(c);
  });
}

function generateStars() {
  sky.innerHTML = "";
  const slice = Number(sliceSelect.value);
  const totalSlices = Math.floor((14 * 60) / slice); // 假设 08:00–22:00

  for (let i = 0; i < totalSlices; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = Math.random() * 760 + "px";
    star.style.top = Math.random() * 360 + "px";
    // 标记切片索引和对应时间
    star.dataset.sliceIndex = i;
    const startMinute = 8 * 60 + i * slice;
    const hh = Math.floor(startMinute / 60);
    const mm = startMinute % 60;
    star.dataset.timeLabel = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;

    star.onclick = () => {
      const slice = Number(sliceSelect.value);

      // 优先使用分配给该星星的 collector，否则使用当前 active
      const assignedId = star.dataset.assignedCollector;
      const collector = assignedId ? collectors.find(c => c.id === assignedId) : collectors.find(c => c.id === activeCollectorId);
      if (!collector) return;

      const starRect = star.getBoundingClientRect();
      const boxRect = collector.boxEl.getBoundingClientRect();

      const targetX = boxRect.left + boxRect.width / 2 - starRect.left - 9;
      const targetY = boxRect.top + boxRect.height / 2 - starRect.top - 9;

      // 先设置过渡，再触发运动（避免瞬移）
      star.style.transition = "transform 0.8s cubic-bezier(.22,1,.36,1), opacity 0.6s";
      star.style.transform = "scale(0.9)";

      requestAnimationFrame(() => {
        // 运动到目标
        star.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.6)`;
        star.style.opacity = 0.95;
      });

      // 等待运动结束后，将元素放入 collector 并做收尾弹性动画
      setTimeout(() => {
        // 先准备最终样式
        star.style.transition = "transform 0.4s cubic-bezier(.34,1.56,.64,1)";

        // 将星星颜色改为 collector 的颜色
        star.style.background = `linear-gradient(145deg, ${collector.color}, ${shadeColor(collector.color, -20)})`;
        star.style.boxShadow = `0 0 6px ${collector.color}, 0 0 12px ${shadeColor(collector.color, -40)}`;

        // 设置为绝对定位并放入 collector 中
        const localLeft = Math.random() * Math.max(0, collector.boxEl.clientWidth - 20);
        const localTop = Math.random() * Math.max(0, collector.boxEl.clientHeight - 20);

        // 将星星从 body 坐标系切换到 collector 坐标系，需要先计算视觉位置偏移，保持无缝
        const starGlobalRect = star.getBoundingClientRect();
        const boxRectNow = collector.boxEl.getBoundingClientRect();

        // 计算当前在页面中的 transform 偏移（approx），然后 append 后设置绝对定位
        star.style.position = 'absolute';
        star.style.left = (starGlobalRect.left - boxRectNow.left) + 'px';
        star.style.top = (starGlobalRect.top - boxRectNow.top) + 'px';

        collector.boxEl.appendChild(star);

        // 轻微回弹到最终随机位置
        requestAnimationFrame(() => {
          star.style.transform = `translate(${localLeft - (starGlobalRect.left - boxRectNow.left)}px, ${localTop - (starGlobalRect.top - boxRectNow.top)}px) scale(1)`;
        });

        // 更新数据与 UI
        totalMinutes += slice;
        totalEl.innerText = totalMinutes;
        collector.minutes += slice;
        collector.minutesEl.innerText = `已: ${collector.minutes} 分钟`;
        // 如果星星是被分配的，减少该 collector 的预计值和更新显示
        if (star.dataset.assignedCollector) {
          delete star.dataset.assignedCollector;
          star.classList.remove('assigned');
          // 重新计算预计
          assignStarsToCollector(collector);
        }
        star.onclick = null;
      }, 900);
    };

    sky.appendChild(star);
  }
}

function shadeColor(hex, percent) {
  // 简单的颜色深浅调整，hex like #rrggbb
  const num = parseInt(hex.replace('#',''),16);
  const r = (num >> 16) + percent;
  const g = ((num >> 8) & 0x00FF) + percent;
  const b = (num & 0x0000FF) + percent;
  const newR = Math.max(0, Math.min(255, r));
  const newG = Math.max(0, Math.min(255, g));
  const newB = Math.max(0, Math.min(255, b));
  return `rgb(${newR}, ${newG}, ${newB})`;
}

// event creation
createEventBtn.onclick = () => {
  const name = eventNameInput.value.trim() || '事件';
  const color = eventColorInput.value || '#ffb703';
  const startH = Number(startHourSelect.value);
  const endH = Number(endHourSelect.value);
  if (endH <= startH) {
    alert('结束时间必须大于开始时间');
    return;
  }
  const c = createCollector(name, color, true, startH, endH);
  // bind actions done in createCollector
  // 分配已有星星
  assignStarsToCollector(c);
  eventNameInput.value = '';
};

sliceSelect.onchange = generateStars;

// 初始化：创建默认收集器并生成星星
createCollector('时间收集器', '#ffb703', true, null, null);
generateStars();
// 在初始生成后，若有现存 collectors，重新分配
assignStarsToAllCollectors();
