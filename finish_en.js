const { chromium } = require('playwright');

async function login(page) {
  await page.goto('https://www.zangia.mn/account/login?type=user', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.fill('#username', 'osohoo586@gmail.com');
  await page.fill('#password', 'Osohoo586@');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
}
async function goToEnglishCV(page) {
  await page.goto('https://www.zangia.mn/dashboard/my-cv', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.locator('#language-selection').getByText('English CV').click();
  await page.waitForTimeout(2000);
}
async function waitDialog(page, t=6000) {
  try { await page.waitForFunction(() => document.querySelector('[data-headlessui-state="open"]')!==null, {timeout:t}); await page.waitForTimeout(500); return true; } catch { return false; }
}
async function getCalendarMonth(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).find(el => {
      const t = el.textContent?.trim();
      const r = el.getBoundingClientRect();
      return t?.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\d{4}$/) && r.width < 150;
    })?.textContent?.trim() || null;
  });
}
async function calPrev(page) {
  await page.evaluate(() => {
    const monthEl = Array.from(document.querySelectorAll('*')).find(el => {
      const t = el.textContent?.trim();
      const r = el.getBoundingClientRect();
      return t?.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\d{4}$/) && r.width < 150;
    });
    const btns = Array.from(monthEl?.parentElement?.querySelectorAll('button')||[]);
    if (btns[0]) btns[0].click();
  });
  await page.waitForTimeout(250);
}
async function pickDay(page, day) {
  return page.evaluate((d) => {
    const cal = Array.from(document.querySelectorAll('[class*="shadow-lg"][class*="rounded"]'))
      .find(el => el.querySelector('[tabindex="0"]') && el.getBoundingClientRect().width < 300);
    if (!cal) return 'no-cal';
    const cells = Array.from(cal.querySelectorAll('[tabindex="0"]')).filter(c => !c.className?.includes('text-gray-400'));
    const cell = cells.find(c => c.textContent?.trim() === String(d));
    if (cell) { cell.click(); return 'ok'; }
    return 'not-found';
  }, day);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  await page.setViewportSize({ width: 1280, height: 1200 });
  await login(page);
  await goToEnglishCV(page);

  // === WORK EXPERIENCE: fix start date by editing existing entry ===
  // Find the edit (pencil) button for the work entry that was added
  const workSection = await page.evaluate(() => {
    return document.querySelector('main')?.innerHTML?.substring(0,5000) || '';
  });
  
  // Check if work experience is still in remaining (sidebar)
  const remaining = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.relative.group'))
      .map(b => b.querySelector(':scope > div:first-child > div:first-child')?.textContent?.trim())
      .filter(Boolean);
  });
  console.log('Remaining:', remaining);

  if (remaining.includes('Work experience')) {
    // Still needs to be filled — open via sidebar
    const g = page.locator('.relative.group').filter({hasText:'Work experience'}).first();
    await g.hover(); await page.waitForTimeout(400);
    await g.locator('div').filter({hasText:'гүйцээж бөглөх'}).first().click({force:true});
  } else {
    // Already has entry, find edit button in work section
    const editClicked = await page.evaluate(() => {
      // Find work experience section heading
      const headings = Array.from(document.querySelectorAll('h3,h4,[class*="font-semibold"]'));
      const workH = headings.find(h => h.textContent?.trim() === 'Work experience');
      // Find pencil edit button nearby
      if (workH) {
        const section = workH.closest('section') || workH.parentElement;
        const pencil = section?.querySelector('button svg path[d*="M21.174"], button[aria-label*="edit"]');
        if (pencil?.closest('button')) { pencil.closest('button').click(); return 'edit-clicked'; }
      }
      return 'not-found';
    });
    console.log('Edit work:', editClicked);
  }
  await page.waitForTimeout(1500);

  if (await waitDialog(page, 4000)) {
    // Fill missing start date
    const startCoords = await page.evaluate(() => {
      const scope = document.querySelector('[data-headlessui-state="open"]');
      const inputs = Array.from(scope?.querySelectorAll('input[placeholder="Select date"]')||[]);
      if (!inputs[0]) return null;
      const r = inputs[0].getBoundingClientRect();
      return {x: r.x+r.width/2, y: r.y+r.height/2, val: inputs[0].value};
    });
    console.log('Start date field:', startCoords);

    if (!startCoords?.val) {
      await page.mouse.click(startCoords.x, startCoords.y);
      await page.waitForTimeout(600);
      // Navigate to Nov 2025
      for (let i = 0; i < 25; i++) {
        const m = await getCalendarMonth(page);
        if (!m || m === 'November2025') break;
        await calPrev(page);
      }
      console.log('Calendar:', await getCalendarMonth(page));
      const dayR = await pickDay(page, 1);
      console.log('Day pick:', dayR);
      await page.waitForTimeout(400);
    }

    // Also check currently working
    await page.evaluate(() => {
      const scope = document.querySelector('[data-headlessui-state="open"]');
      const cb = scope?.querySelector('input[type="checkbox"]');
      if (cb && !cb.checked) cb.click();
    });

    const saveR = await page.evaluate(() => {
      const scope = document.querySelector('[data-headlessui-state="open"]') || document.body;
      const btn = Array.from(scope.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Save');
      if (btn) { btn.click(); return 'saved'; }
      return 'no-save';
    });
    console.log('Work save:', saveR);
    await page.waitForTimeout(4000);
  }

  await goToEnglishCV(page);

  // === TRAINING AND CERTIFICATION ===
  const remaining2 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.relative.group'))
      .map(b => b.querySelector(':scope > div:first-child > div:first-child')?.textContent?.trim()).filter(Boolean);
  });
  console.log('Remaining after work:', remaining2);

  if (remaining2.includes('Training and certification')) {
    const g2 = page.locator('.relative.group').filter({hasText:'Training and certification'}).first();
    await g2.hover(); await page.waitForTimeout(400);
    await g2.locator('div').filter({hasText:'гүйцээж бөглөх'}).first().click({force:true});
    await page.waitForTimeout(1200);

    if (await waitDialog(page, 4000)) {
      await page.evaluate((v) => {
        const scope = document.querySelector('[data-headlessui-state="open"]');
        const el = scope?.querySelector('input[name="title"]');
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
        if (s && el) { s.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
      }, 'Deep Learning and NLP Specialization');

      await page.evaluate((v) => {
        const scope = document.querySelector('[data-headlessui-state="open"]');
        const el = scope?.querySelector('input[name="tcenter"]');
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
        if (s && el) { s.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
      }, 'Self-study (PyTorch, Hugging Face, LangChain)');

      // Start date: click and navigate to Jan 2024
      const tStartCoords = await page.evaluate(() => {
        const scope = document.querySelector('[data-headlessui-state="open"]');
        const inputs = Array.from(scope?.querySelectorAll('input[placeholder="Select date"]')||[]);
        if (!inputs[0]) return null;
        const r = inputs[0].getBoundingClientRect();
        return {x: r.x+r.width/2, y: r.y+r.height/2};
      });
      if (tStartCoords) {
        await page.mouse.click(tStartCoords.x, tStartCoords.y);
        await page.waitForTimeout(600);
        for (let i = 0; i < 30; i++) {
          const m = await getCalendarMonth(page);
          if (!m || m === 'January2024') break;
          await calPrev(page);
        }
        console.log('Training calendar:', await getCalendarMonth(page));
        const dr = await pickDay(page, 15);
        console.log('Training day:', dr);
        await page.waitForTimeout(400);
      }

      // Still ongoing
      await page.evaluate(() => {
        const scope = document.querySelector('[data-headlessui-state="open"]');
        const cb = scope?.querySelector('input[name="still_ongoing"]');
        if (cb && !cb.checked) cb.click();
      });

      const tSaveR = await page.evaluate(() => {
        const scope = document.querySelector('[data-headlessui-state="open"]') || document.body;
        const btn = Array.from(scope.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Save');
        if (btn) { btn.click(); return 'saved'; }
        return 'no-save';
      });
      console.log('Training save:', tSaveR);
      await page.waitForTimeout(4000);
    }
  }

  // Final
  await goToEnglishCV(page);
  await page.screenshot({path:'/tmp/finish_final.png', fullPage: false});
  const prog = await page.evaluate(() => document.body.innerText.match(/(\d+)\s*\/\s*12/)?.[0]);
  console.log('\n=== FINAL PROGRESS:', prog, '===');
  const rem = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.relative.group'))
      .map(b => b.querySelector(':scope > div:first-child > div:first-child')?.textContent?.trim()).filter(Boolean);
  });
  console.log('Still remaining:', rem);

  await browser.close();
})();
