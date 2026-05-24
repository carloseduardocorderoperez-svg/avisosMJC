
    window.AVISOS_SETS = [{"slug":"16abril2026","title":"AVISOS ZONALES","date":"2026-05-21T00:00:00.000Z","publishedAt":"2026-05-22T02:54:47.163Z"},{"slug":"1mayo2026","title":"AVISOS ZONALES","date":"2026-05-21T00:00:00.000Z","publishedAt":"2026-05-22T02:41:34.463Z"}];
    (function(){
      const sets = Array.isArray(window.AVISOS_SETS) ? window.AVISOS_SETS : [];
      const root = document.getElementById('root');
      if(!root) return;
      if(sets.length === 0){
        root.innerHTML = '<p class="lead">No hay avisos publicados.</p>';
        return;
      }

      function parseDate(s){
        if(!s) return new Date();
        const str = String(s).trim();
        const iso = str.match(/^(d{4}-d{2}-d{2})/);
        if(iso){const p = iso[1].split('-');return new Date(parseInt(p[0],10), parseInt(p[1],10)-1, parseInt(p[2],10));}
        const dm = str.match(/^(d{1,2})/(d{1,2})/(d{2,4})$/);
        if(dm){const day = parseInt(dm[1],10);const month = parseInt(dm[2],10)-1;const year = dm[3].length===2?2000+parseInt(dm[3],10):parseInt(dm[3],10);return new Date(year,month,day);} 
        const d = new Date(str); if(!isNaN(d.getTime())) return d; return new Date();
      }

      function formatLong(d){
        const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        return d.getDate() + ' de ' + months[d.getMonth()] + ' del ' + d.getFullYear();
      }

      // Group by year -> month
      const grouped = {};
      let newest = null;
      sets.forEach(function(s){
        const date = parseDate(s.date || s.publishedAt || '');
        if(!newest || date > newest) newest = date;
        const y = date.getFullYear();
        const m = date.getMonth();
        grouped[y] = grouped[y] || {};
        grouped[y][m] = grouped[y][m] || [];
        grouped[y][m].push({slug: s.slug, title: s.title, date: date});
      });

      const years = Object.keys(grouped).map(function(v){return parseInt(v,10)}).sort(function(a,b){return b-a});
      const expandYear = newest ? newest.getFullYear() : (new Date()).getFullYear();
      const expandMonth = newest ? newest.getMonth() : (new Date()).getMonth();

      const container = document.createElement('div'); container.className = 'years';

      years.forEach(function(year){
        const monthsObj = grouped[year] || {};
        const monthKeys = Object.keys(monthsObj).map(function(v){return parseInt(v,10)}).sort(function(a,b){return b-a});
        const yearCount = monthKeys.reduce(function(acc,m){return acc + (monthsObj[m] ? monthsObj[m].length : 0);}, 0);

        const yearBlock = document.createElement('section'); yearBlock.className = 'year-block';

        const yearToggle = document.createElement('button');
        yearToggle.className = 'year-toggle';
        yearToggle.setAttribute('aria-expanded', String(year === expandYear));
        yearToggle.setAttribute('data-year', String(year));
        yearToggle.innerHTML = '<span class="year-label">'+year+'</span><span class="meta"><span class="count">'+yearCount+'</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></span>';

        const monthsContainer = document.createElement('div'); monthsContainer.className = 'months';
        if(year !== expandYear) monthsContainer.setAttribute('hidden','');

        monthKeys.forEach(function(monthIdx){
          const items = (monthsObj[monthIdx] || []).slice().sort(function(a,b){return b.date - a.date;});
          const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          const monthName = monthNames[monthIdx] || String(monthIdx+1);

          const monthBlock = document.createElement('div'); monthBlock.className = 'month-block';
          const monthToggle = document.createElement('button');
          monthToggle.className = 'month-toggle';
          monthToggle.setAttribute('aria-expanded', String(year === expandYear && monthIdx === expandMonth));
          monthToggle.innerHTML = '<span>'+monthName+'</span><span class="meta"><span class="count">'+items.length+'</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></span>';

          const itemsList = document.createElement('ul'); itemsList.className = 'items';
          if(!(year === expandYear && monthIdx === expandMonth)) itemsList.setAttribute('hidden','');

          items.forEach(function(it){
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = './' + it.slug + '/';
            a.textContent = formatLong(it.date);
            li.appendChild(a);
            itemsList.appendChild(li);
          });

          monthToggle.addEventListener('click', function(){
            const expanded = monthToggle.getAttribute('aria-expanded') === 'true';
            monthToggle.setAttribute('aria-expanded', String(!expanded));
            if(expanded) itemsList.setAttribute('hidden',''); else itemsList.removeAttribute('hidden');
          });

          monthBlock.appendChild(monthToggle);
          monthBlock.appendChild(itemsList);
          monthsContainer.appendChild(monthBlock);
        });

        yearToggle.addEventListener('click', function(){
          const expanded = yearToggle.getAttribute('aria-expanded') === 'true';
          yearToggle.setAttribute('aria-expanded', String(!expanded));
          if(expanded) monthsContainer.setAttribute('hidden',''); else monthsContainer.removeAttribute('hidden');
        });

        yearBlock.appendChild(yearToggle);
        yearBlock.appendChild(monthsContainer);
        container.appendChild(yearBlock);
      });

      root.appendChild(container);
    })();
  