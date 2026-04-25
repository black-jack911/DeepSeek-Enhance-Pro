// ==UserScript==
// @name         DeepSeek 全面增强 Pro
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  专家模式锁定、侧边栏分组管理、搜索、默认收起
// @author       black-jack911
// @match        https://chat.deepseek.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const USER_CONFIG = {
        deepThink: 0,
        webSearch: 0,
        defaultModel: 0,
        groups: {
            important: '⭐ 重要',
            work: '💼 工作',
            study: '📚 学习',
            other: '📋 其他'
        }
    };

    const CONFIG = {
        DEBOUNCE_DELAY: 200,
        STABLE_INTERVAL: 3000,
        OBSERVER_THROTTLE: 500,
        SIDEBAR_CHECK: 1000,
        SIDEBAR_TIMEOUT: 15000,
        GROUP_COLORS: [
            { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
            { bg: '#f3e5f5', border: '#9c27b0', text: '#6a1b9a' },
            { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
            { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
            { bg: '#fce4ec', border: '#e91e63', text: '#c62828' },
            { bg: '#e0f7fa', border: '#00bcd4', text: '#00838f' }
        ],
        SEL: {
            sidebar: '._3586175',
            chatList: '._77cdc67',
            timeGroup: '._3098d02',
            chatItem: 'a[href*="/a/chat/s/"]',
            chatTitle: '.c08e6e93',
            modeContainer: '.ec4f5d61',
            toggleBtn: '.ds-toggle-button',
            toggleLabel: '._6dbc175',
            modelExpert: 'div[data-model-type="expert"]',
            modelDefault: 'div[data-model-type="default"]'
        }
    };

    // ==================== 样式 ====================
    GM_addStyle(`
        ._1d72f01 { display:flex!important;flex-direction:column!important;min-height:0!important }
        ._3586175 { flex:1 1 auto!important;min-height:0!important;position:relative!important }
        ._77cdc67 { padding-bottom:12px!important }
        ._2afd28d { position:sticky!important;bottom:0!important;z-index:10!important;
            background:var(--dsw-alias-bg-secondary,#f9f9f9)!important;
            backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
            border-top:1px solid rgba(0,0,0,.08);box-shadow:0 -4px 12px rgba(0,0,0,.04) }
        body.dark ._2afd28d,html.dark ._2afd28d { background:var(--dsw-alias-bg-secondary,#1e1e1e)!important;
            border-top-color:rgba(255,255,255,.08) }

        .ds-group-section { margin-bottom:4px;border-radius:8px;overflow:hidden }
        .ds-group-header { padding:6px 12px;margin:2px 0;border-radius:6px;font-size:11px;
            font-weight:600;cursor:pointer;user-select:none;display:flex;align-items:center;
            justify-content:space-between;transition:background .2s;min-height:28px }
        .ds-group-header:hover { filter:brightness(.95) }
        .ds-group-arrow { font-size:10px;transition:transform .25s;display:inline-block;margin-left:8px }
        .ds-group-header.collapsed .ds-group-arrow { transform:rotate(-90deg) }
        .ds-group-count { font-size:10px;font-weight:normal;opacity:.7;margin-left:6px }
        .ds-group-content { overflow:hidden;transition:max-height .3s ease;max-height:5000px }
        .ds-group-content.collapsed { max-height:0!important }
        .ds-group-content:empty::after { content:'右键聊天加入此分组';display:block;padding:8px 12px;
            text-align:center;color:#999;font-size:11px;font-style:italic }

        .ds-ungrouped-section { margin-top:8px }
        .ds-ungrouped-header { padding:6px 12px;font-size:11px;color:#888;font-weight:600;
            display:flex;align-items:center;gap:6px }

        .ds-search-box { padding:6px 12px;margin:6px 0;border:1px solid rgba(0,0,0,.1);
            border-radius:10px;display:flex;align-items:center;gap:8px;
            background:rgba(255,255,255,.6);backdrop-filter:blur(10px) }
        .ds-search-box input { flex:1;border:none;outline:none;background:transparent;color:inherit;font-size:13px }
        .ds-search-clear { cursor:pointer;display:none;padding:2px 6px;border-radius:3px;font-size:12px;color:#666 }
        .ds-search-clear:hover { background:rgba(0,0,0,.05) }
        .ds-search-box.has-text .ds-search-clear { display:block }
        .ds-chat-highlight { animation:ds-pulse 1s ease;background:rgba(77,107,254,.1)!important;border-radius:6px }
        @keyframes ds-pulse { 0%,to{background:rgba(77,107,254,.1)} 50%{background:rgba(77,107,254,.25)} }

        .ds-ctx-menu { position:fixed;background:#fff;border:1px solid rgba(0,0,0,.1);
            box-shadow:0 8px 32px rgba(0,0,0,.15);border-radius:12px;z-index:99999;padding:6px;
            min-width:200px;font-size:13px }
        .ds-ctx-item { padding:10px 12px;cursor:pointer;border-radius:6px;color:#333;
            display:flex;align-items:center;gap:10px;transition:background .15s }
        .ds-ctx-item:hover { background:#f0f0f0 }
        .ds-ctx-sep { height:1px;background:rgba(0,0,0,.08);margin:6px 0 }

        @media (prefers-color-scheme:dark) {
            .ds-search-box { background:rgba(30,30,30,.6);border-color:rgba(255,255,255,.1) }
            .ds-ctx-menu { background:#1e1e1e;border-color:rgba(255,255,255,.1) }
            .ds-ctx-item { color:#e0e0e0 }
            .ds-ctx-item:hover { background:rgba(255,255,255,.06) }
            .ds-ctx-sep { background:rgba(255,255,255,.1) }
        }
    `);

    // ==================== 工具 ====================
    const $ = (s,p=document) => { try{return p.querySelector(s)}catch{return null} };
    const $$ = (s,p=document) => { try{return [...p.querySelectorAll(s)]}catch{return[]} };
    const debounce = (f,w) => { let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),w)} };
    const throttle = (f,l) => { let ok=true;return(...a)=>{if(ok){f(...a);ok=false;setTimeout(()=>ok=true,l)}} };
    const storage = { get(k,d=null){try{const v=GM_getValue(k);return v!==undefined?v:d}catch{return d}},
        set(k,v){try{GM_setValue(k,v)}catch(e){console.warn(e)}} };

    // ==================== 模式控制 ====================
    const ModeController = {
        observer:null,intervalId:null,running:false,initialApplied:false,
        start(){
            if(this.running)return;this.running=true;this.initialApplied=false;
            this.apply();this.setupObserver();this.intervalId=setInterval(()=>this.apply(),CONFIG.STABLE_INTERVAL);
            let c=0;const fa=()=>{if(c<30){this.apply();c++;requestAnimationFrame(fa)}else this.initialApplied=true};
            requestAnimationFrame(fa);
        },
        stop(){ this.running=false;if(this.intervalId)clearInterval(this.intervalId);if(this.observer)this.observer.disconnect() },
        setupObserver(){
            if(this.observer)this.observer.disconnect();
            const h=throttle(()=>{if(this.initialApplied)this.apply()},CONFIG.OBSERVER_THROTTLE);
            this.observer=new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList'||m.type==='attributes'){h();return}}});
            const to=()=>{const c=$(CONFIG.SEL.modeContainer);if(c)this.observer.observe(c,{childList:true,attributes:true,subtree:true,attributeFilter:['class','aria-checked','aria-pressed']});else setTimeout(to,200)};
            to();
        },
        apply(){
            try{
                const expert=$(CONFIG.SEL.modelExpert),fast=$(CONFIG.SEL.modelDefault);
                if(expert&&fast){const t=USER_CONFIG.defaultModel===0?expert:fast;if(t.getAttribute('aria-checked')!=='true'){t.click();return}}
                const c=$(CONFIG.SEL.modeContainer);if(!c)return;
                $$(CONFIG.SEL.toggleBtn,c).forEach(btn=>{
                    const l=$(CONFIG.SEL.toggleLabel,btn);if(!l)return;
                    const text=l.textContent.trim(),isSel=btn.classList.contains('selected')||btn.getAttribute('aria-pressed')==='true'||btn.classList.contains('ds-toggle-button--selected');
                    let want;if(text.includes('深度思考')||text.includes('DeepThink'))want=USER_CONFIG.deepThink===1;
                    else if(text.includes('智能搜索')||text.includes('联网搜索')||text.includes('WebSearch'))want=USER_CONFIG.webSearch===1;else return;
                    if(isSel!==want)btn.click();
                });
            }catch(e){console.warn('[Mode]',e)}
        }
    };

    // ==================== 侧边栏 ====================
    const SidebarManager = {
        sidebar:null,groups:new Map(),ctxMenu:null,searchBox:null,initialized:false,
        chatObserver:null,groupSections:new Map(),ungroupedSection:null,

        start(){
            if(this.initialized)return;
            const st=Date.now();
            const find=()=>{
                if(Date.now()-st>CONFIG.SIDEBAR_TIMEOUT){console.warn('[Sidebar]超时');return}
                const sb=$(CONFIG.SEL.sidebar);
                if(sb&&sb.querySelector(CONFIG.SEL.chatItem)){this.sidebar=sb;this.init();this.initialized=true}
                else setTimeout(find,CONFIG.SIDEBAR_CHECK);
            };
            setTimeout(find,300);
        },

        loadGroups(){
            const s=storage.get('sidebar_groups');
            if(s){try{const p=JSON.parse(s);this.groups=new Map(Object.entries(p));return}catch(e){console.warn('[Sidebar]加载失败',e)}}
            this.groups.clear();
            Object.entries(USER_CONFIG.groups).forEach(([k,n],i)=>{this.groups.set(k,{name:n,color:i,items:[]})});
        },

        saveGroups(){
            const o={};this.groups.forEach((v,k)=>{o[k]={name:v.name,color:v.color,items:v.items||[]}});
            storage.set('sidebar_groups',JSON.stringify(o));
        },

        init(){
            this.loadGroups();this.injectSearch();this.injectGroups();this.setupMenu();
            setTimeout(()=>this.redistribute(),600);this.watch();
        },

        injectSearch(){
            const cl=$(CONFIG.SEL.chatList);if(!cl)return;
            const b=document.createElement('div');b.className='ds-search-box';
            b.innerHTML='<span style="font-size:14px">🔍</span><input type="text" placeholder="搜索聊天..."><span class="ds-search-clear" title="清除">✕</span>';
            const inp=$('input',b);
            inp.addEventListener('input',debounce(()=>{const q=inp.value.toLowerCase().trim();b.classList.toggle('has-text',!!q);q?this.search(q):this.clearSearch()},300));
            $('.ds-search-clear',b).addEventListener('click',()=>{inp.value='';b.classList.remove('has-text');this.clearSearch()});
            inp.addEventListener('keydown',e=>{if(e.key==='Escape'){inp.value='';b.classList.remove('has-text');this.clearSearch()}});
            this.searchBox=b;cl.insertBefore(b,cl.firstChild);
        },

        search(q){
            const a=$$(CONFIG.SEL.chatItem,this.sidebar);
            a.forEach(i=>{const t=$(CONFIG.SEL.chatTitle,i);const m=t?.textContent.toLowerCase().includes(q);i.style.display=m?'':'none';if(m){i.classList.add('ds-chat-highlight');setTimeout(()=>i.classList.remove('ds-chat-highlight'),1500)}});
            // 搜索时展开所有分组
            this.groupSections.forEach(({header,content})=>{header.classList.remove('collapsed');content.classList.remove('collapsed')});
        },

        clearSearch(){
            // 恢复聊天项显示
            $$(CONFIG.SEL.chatItem,this.sidebar).forEach(i=>{i.style.display='';i.classList.remove('ds-chat-highlight')});
            // 恢复所有分组为收起状态
            this.groupSections.forEach(({header,content})=>{
                header.classList.add('collapsed');
                content.classList.add('collapsed');
            });
        },

        injectGroups(){
            const cl=$(CONFIG.SEL.chatList);if(!cl)return;
            $$('.ds-group-section',cl).forEach(n=>n.remove());$$('.ds-ungrouped-section',cl).forEach(n=>n.remove());
            this.groupSections.clear();this.ungroupedSection=null;
            const frag=document.createDocumentFragment();

            this.groups.forEach((data,key)=>{
                const sec=document.createElement('div');sec.className='ds-group-section';sec.dataset.groupKey=key;
                const c=CONFIG.GROUP_COLORS[data.color%CONFIG.GROUP_COLORS.length];
                const count=data.items?.length||0;
                const header=document.createElement('div');header.className='ds-group-header collapsed';
                header.style.cssText=`background:${c.bg};border-left:3px solid ${c.border};color:${c.text};`;
                header.innerHTML=`<span>${data.name}<span class="ds-group-count">(${count})</span></span><span class="ds-group-arrow">▼</span>`;
                const content=document.createElement('div');content.className='ds-group-content collapsed';
                header.addEventListener('click',e=>{if(e.button!==0)return;const col=!header.classList.contains('collapsed');header.classList.toggle('collapsed',col);content.classList.toggle('collapsed',col)});
                header.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const nn=prompt(`重命名 "${data.name}":`,data.name);if(nn?.trim()){data.name=nn.trim();header.querySelector('span').childNodes[0].textContent=nn.trim();this.saveGroups()}});
                sec.appendChild(header);sec.appendChild(content);frag.appendChild(sec);
                this.groupSections.set(key,{section:sec,header,content});
            });

            const us=document.createElement('div');us.className='ds-ungrouped-section';us.style.marginTop='8px';
            const uh=document.createElement('div');uh.className='ds-ungrouped-header';uh.textContent='📋 未分组';
            const uc=document.createElement('div');uc.className='ds-ungrouped-content';
            us.appendChild(uh);us.appendChild(uc);frag.appendChild(us);
            this.ungroupedSection={section:us,header:uh,content:uc};

            let ref=cl.firstChild;while(ref&&ref.classList.contains('ds-search-box'))ref=ref.nextSibling;
            cl.insertBefore(frag,ref);
        },

        redistribute(){
            const cl=$(CONFIG.SEL.chatList);if(!cl)return;
            const all=$$(CONFIG.SEL.chatItem,cl);if(all.length===0)return;
            const hm=new Map();all.forEach(el=>{const h=el.getAttribute('href');if(h)hm.set(h,el)});
            this.groupSections.forEach(({content})=>{content.innerHTML=''});
            if(this.ungroupedSection)this.ungroupedSection.content.innerHTML='';
            const assigned=new Set();

            this.groups.forEach((data,key)=>{
                const content=this.groupSections.get(key)?.content;if(!content||!data.items)return;
                data.items.forEach(href=>{const el=hm.get(href);if(el&&!assigned.has(href)){content.appendChild(el);assigned.add(href)}});
                const header=this.groupSections.get(key)?.header;
                if(header){const ce=header.querySelector('.ds-group-count');if(ce)ce.textContent=`(${content.children.length})`}
            });

            if(this.ungroupedSection){hm.forEach((el,href)=>{if(!assigned.has(href)){this.ungroupedSection.content.appendChild(el);assigned.add(href)}})}

            const tgs=$$(CONFIG.SEL.timeGroup,cl);
            tgs.forEach(tg=>{const v=tg.querySelector(CONFIG.SEL.chatItem);tg.style.display=v?'':'none'});

            this.groups.forEach((data,key)=>{const content=this.groupSections.get(key)?.content;if(content&&data.items){const es=new Set();content.querySelectorAll(CONFIG.SEL.chatItem).forEach(el=>es.add(el.getAttribute('href')));data.items=data.items.filter(h=>es.has(h))}});
            this.saveGroups();
        },

        moveToGroup(href,targetKey){
            this.groups.forEach(d=>{if(d.items)d.items=d.items.filter(h=>h!==href)});
            const t=this.groups.get(targetKey);if(t){if(!t.items)t.items=[];if(!t.items.includes(href))t.items.push(href)}
            this.redistribute();
        },

        removeFromGroup(href){ this.groups.forEach(d=>{if(d.items)d.items=d.items.filter(h=>h!==href)});this.redistribute() },

        setupMenu(){
            if(this.ctxMenu)this.ctxMenu.remove();
            const m=document.createElement('div');m.className='ds-ctx-menu';m.style.display='none';document.body.appendChild(m);this.ctxMenu=m;
            this.sidebar.addEventListener('contextmenu',e=>{const ci=e.target.closest(CONFIG.SEL.chatItem);if(!ci)return;e.preventDefault();e.stopPropagation();this.showMenu(e.clientX,e.clientY,ci)},true);
            document.addEventListener('click',()=>{m.style.display='none'});
        },

        showMenu(x,y,chatItem){
            const m=this.ctxMenu;if(!m)return;
            const href=chatItem.getAttribute('href');if(!href)return;
            let cg=null;this.groups.forEach((d,k)=>{if(d.items?.includes(href))cg=k});
            m.innerHTML='';const frag=document.createDocumentFragment();
            this.groups.forEach((d,k)=>{const c=CONFIG.GROUP_COLORS[d.color%CONFIG.GROUP_COLORS.length];const isCur=k===cg;
                const it=document.createElement('div');it.className='ds-ctx-item';
                it.innerHTML=`<span style="width:10px;height:10px;border-radius:50%;background:${c.border};display:inline-block"></span>${isCur?'✅ ':''}${d.name}`;
                it.addEventListener('click',e=>{e.stopPropagation();if(!isCur)this.moveToGroup(href,k);m.style.display='none'});frag.appendChild(it)});
            const s1=document.createElement('div');s1.className='ds-ctx-sep';frag.appendChild(s1);
            if(cg){const ri=document.createElement('div');ri.className='ds-ctx-item';ri.textContent='📤 移出分组';
                ri.addEventListener('click',e=>{e.stopPropagation();this.removeFromGroup(href);m.style.display='none'});frag.appendChild(ri);
                const s2=document.createElement('div');s2.className='ds-ctx-sep';frag.appendChild(s2)}
            const ng=document.createElement('div');ng.className='ds-ctx-item';ng.textContent='📁 新建分组并移入';
            ng.addEventListener('click',e=>{e.stopPropagation();const nm=prompt('分组名称:');if(nm?.trim()){const nk='g_'+Date.now();this.groups.set(nk,{name:nm.trim(),color:this.groups.size%CONFIG.GROUP_COLORS.length,items:[href]});this.groups.forEach(d=>{if(d.items)d.items=d.items.filter(h=>h!==href)});this.injectGroups();setTimeout(()=>this.redistribute(),100)}m.style.display='none'});
            frag.appendChild(ng);m.appendChild(frag);m.style.display='block';
            const mw=220,mh=m.offsetHeight||300;m.style.left=Math.min(x,innerWidth-mw-10)+'px';m.style.top=Math.min(y,innerHeight-mh-10)+'px';
        },

        watch(){
            const cl=$(CONFIG.SEL.chatList);if(!cl)return;if(this.chatObserver)this.chatObserver.disconnect();
            this.chatObserver=new MutationObserver(debounce(()=>this.redistribute(),800));
            this.chatObserver.observe(cl,{childList:true,subtree:true});
        }
    };

    // ==================== 启动 ====================
    const init=()=>{console.log('🚀 DeepSeek Pro v1.0');ModeController.start();setTimeout(()=>SidebarManager.start(),600)};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,200));
    else setTimeout(init,200);
    window.addEventListener('beforeunload',()=>SidebarManager.saveGroups());
})();