import { n as e } from "./chunks/rolldown-runtime.js";
// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis, n = t.ShadowRoot && (t.ShadyCSS === void 0 || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, r = Symbol(), i = /* @__PURE__ */ new WeakMap(), a = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== r) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (n && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = i.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && i.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, o = (e) => new a(typeof e == "string" ? e : e + "", void 0, r), s = (e, ...t) => new a(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, r), c = (e, r) => {
	if (n) e.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of r) {
		let r = document.createElement("style"), i = t.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = n.cssText, e.appendChild(r);
	}
}, l = n ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return o(t);
})(e) : e, { is: u, defineProperty: d, getOwnPropertyDescriptor: ee, getOwnPropertyNames: te, getOwnPropertySymbols: ne, getPrototypeOf: re } = Object, ie = globalThis, ae = ie.trustedTypes, oe = ae ? ae.emptyScript : "", se = ie.reactiveElementPolyfillSupport, f = (e, t) => e, ce = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? oe : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, le = (e, t) => !u(e, t), ue = {
	attribute: !0,
	type: String,
	converter: ce,
	reflect: !1,
	useDefault: !1,
	hasChanged: le
};
Symbol.metadata ??= Symbol("metadata"), ie.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var p = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ue) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && d(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ee(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? ue;
	}
	static _$Ei() {
		if (this.hasOwnProperty(f("elementProperties"))) return;
		let e = re(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(f("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(f("properties"))) {
			let e = this.properties, t = [...te(e), ...ne(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(l(e));
		} else e !== void 0 && t.push(l(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return c(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? ce : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ce : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? le)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
p.elementStyles = [], p.shadowRootOptions = { mode: "open" }, p[f("elementProperties")] = /* @__PURE__ */ new Map(), p[f("finalized")] = /* @__PURE__ */ new Map(), se?.({ ReactiveElement: p }), (ie.reactiveElementVersions ??= []).push("2.1.2");
// node_modules/lit-html/lit-html.js
var de = globalThis, fe = (e) => e, pe = de.trustedTypes, me = pe ? pe.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, he = "$lit$", m = `lit$${Math.random().toFixed(9).slice(2)}$`, ge = "?" + m, _e = `<${ge}>`, h = document, g = () => h.createComment(""), _ = (e) => e === null || typeof e != "object" && typeof e != "function", ve = Array.isArray, ye = (e) => ve(e) || typeof e?.[Symbol.iterator] == "function", be = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, xe = /-->/g, Se = />/g, y = RegExp(`>|${be}(?:([^\\s"'>=/]+)(${be}*=${be}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Ce = /'/g, we = /"/g, Te = /^(?:script|style|textarea|title)$/i, b = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), x = Symbol.for("lit-noChange"), S = Symbol.for("lit-nothing"), Ee = /* @__PURE__ */ new WeakMap(), C = h.createTreeWalker(h, 129);
function De(e, t) {
	if (!ve(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return me === void 0 ? t : me.createHTML(t);
}
var Oe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = v;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === v ? c[1] === "!--" ? o = xe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = y) : (Te.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = y) : o = Se : o === y ? c[0] === ">" ? (o = i ?? v, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? y : c[3] === "\"" ? we : Ce) : o === we || o === Ce ? o = y : o === xe || o === Se ? o = v : (o = y, i = void 0);
		let d = o === y && e[t + 1].startsWith("/>") ? " " : "";
		a += o === v ? n + _e : l >= 0 ? (r.push(s), n.slice(0, l) + he + n.slice(l) + m + d) : n + m + (l === -2 ? t : d);
	}
	return [De(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, ke = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Oe(t, n);
		if (this.el = e.createElement(l, r), C.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = C.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(he)) {
					let t = u[o++], n = i.getAttribute(e).split(m), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Me : r[1] === "?" ? Ne : r[1] === "@" ? Pe : T
					}), i.removeAttribute(e);
				} else e.startsWith(m) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Te.test(i.tagName)) {
					let e = i.textContent.split(m), t = e.length - 1;
					if (t > 0) {
						i.textContent = pe ? pe.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], g()), C.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], g());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ge) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(m, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += m.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = h.createElement("template");
		return n.innerHTML = e, n;
	}
};
function w(e, t, n = e, r) {
	if (t === x) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = _(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = w(e, i._$AS(e, t.values), i, r)), t;
}
var Ae = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? h).importNode(t, !0);
		C.currentNode = r;
		let i = C.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new je(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Fe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = C.nextNode(), a++);
		}
		return C.currentNode = h, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, je = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = S, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = w(this, e, t), _(e) ? e === S || e == null || e === "" ? (this._$AH !== S && this._$AR(), this._$AH = S) : e !== this._$AH && e !== x && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ye(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== S && _(this._$AH) ? this._$AA.nextSibling.data = e : this.T(h.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = ke.createElement(De(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ae(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ee.get(e.strings);
		return t === void 0 && Ee.set(e.strings, t = new ke(e)), t;
	}
	k(t) {
		ve(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(g()), this.O(g()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = fe(e).nextSibling;
			fe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, T = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = S, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = S;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = w(this, e, t, 0), a = !_(e) || e !== this._$AH && e !== x, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = w(this, r[n + o], t, o), s === x && (s = this._$AH[o]), a ||= !_(s) || s !== this._$AH[o], s === S ? e = S : e !== S && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === S ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Me = class extends T {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === S ? void 0 : e;
	}
}, Ne = class extends T {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== S);
	}
}, Pe = class extends T {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = w(this, e, t, 0) ?? S) === x) return;
		let n = this._$AH, r = e === S && n !== S || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== S && (n === S || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Fe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		w(this, e);
	}
}, Ie = {
	M: he,
	P: m,
	A: ge,
	C: 1,
	L: Oe,
	R: Ae,
	D: ye,
	V: w,
	I: je,
	H: T,
	N: Ne,
	U: Pe,
	B: Me,
	F: Fe
}, Le = de.litHtmlPolyfillSupport;
Le?.(ke, je), (de.litHtmlVersions ??= []).push("3.3.3");
var Re = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new je(t.insertBefore(g(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, ze = globalThis, E = class extends p {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Re(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return x;
	}
};
E._$litElement$ = !0, E.finalized = !0, ze.litElementHydrateSupport?.({ LitElement: E });
var Be = ze.litElementPolyfillSupport;
Be?.({ LitElement: E }), (ze.litElementVersions ??= []).push("4.2.2");
// node_modules/lit-html/directive.js
var D = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Ve = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), He = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, Ue = class extends He {
	constructor(e) {
		if (super(e), this.it = S, e.type !== D.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
	}
	render(e) {
		if (e === S || e == null) return this._t = void 0, this.it = e;
		if (e === x) return e;
		if (typeof e != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
		if (e === this.it) return this._t;
		this.it = e;
		let t = [e];
		return t.raw = t, this._t = {
			_$litType$: this.constructor.resultType,
			strings: t,
			values: []
		};
	}
};
Ue.directiveName = "unsafeHTML", Ue.resultType = 1;
var We = Ve(Ue), { I: Ge } = Ie, Ke = (e) => e.strings === void 0, qe = {}, Je = (e, t = qe) => e._$AH = t, O = (e, t) => {
	let n = e._$AN;
	if (n === void 0) return !1;
	for (let e of n) e._$AO?.(t, !1), O(e, t);
	return !0;
}, Ye = (e) => {
	let t, n;
	do {
		if ((t = e._$AM) === void 0) break;
		n = t._$AN, n.delete(e), e = t;
	} while (n?.size === 0);
}, Xe = (e) => {
	for (let t; t = e._$AM; e = t) {
		let n = t._$AN;
		if (n === void 0) t._$AN = n = /* @__PURE__ */ new Set();
		else if (n.has(e)) break;
		n.add(e), $e(t);
	}
};
function Ze(e) {
	this._$AN === void 0 ? this._$AM = e : (Ye(this), this._$AM = e, Xe(this));
}
function Qe(e, t = !1, n = 0) {
	let r = this._$AH, i = this._$AN;
	if (i !== void 0 && i.size !== 0) {
		if (t) {
			if (Array.isArray(r)) for (let e = n; e < r.length; e++) O(r[e], !1), Ye(r[e]);
			else r != null && (O(r, !1), Ye(r));
		} else O(this, e);
	}
}
var $e = (e) => {
	e.type == D.CHILD && (e._$AP ??= Qe, e._$AQ ??= Ze);
}, et = class extends He {
	constructor() {
		super(...arguments), this._$AN = void 0;
	}
	_$AT(e, t, n) {
		super._$AT(e, t, n), Xe(this), this.isConnected = e._$AU;
	}
	_$AO(e, t = !0) {
		e !== this.isConnected && (this.isConnected = e, e ? this.reconnected?.() : this.disconnected?.()), t && (O(this, e), Ye(this));
	}
	setValue(e) {
		if (Ke(this._$Ct)) this._$Ct._$AI(e, this);
		else {
			let t = [...this._$Ct._$AH];
			t[this._$Ci] = e, this._$Ct._$AI(t, this, 0);
		}
	}
	disconnected() {}
	reconnected() {}
}, tt = /* @__PURE__ */ new WeakMap(), nt = Ve(class extends et {
	render(e) {
		return S;
	}
	update(e, [t]) {
		let n = t !== this.G;
		return n && this.rt(void 0), (n || this.lt !== this.ct) && (this.G = t, this.ht = e.options?.host, this.rt(this.ct = e.element)), S;
	}
	rt(e) {
		if (this.G !== void 0) {
			if (this.isConnected || (e = void 0), typeof this.G == "function") {
				let t = this.ht ?? globalThis, n = tt.get(t);
				n === void 0 && (n = /* @__PURE__ */ new WeakMap(), tt.set(t, n)), n.get(this.G) !== void 0 && this.G.call(this.ht, void 0), n.set(this.G, e), e !== void 0 && this.G.call(this.ht, e);
			} else this.G.value = e;
		}
	}
	get lt() {
		return typeof this.G == "function" ? tt.get(this.ht ?? globalThis)?.get(this.G) : this.G?.value;
	}
	disconnected() {
		this.lt === this.ct && this.rt(void 0);
	}
	reconnected() {
		this.rt(this.ct);
	}
}), rt = 200, k = /* @__PURE__ */ new Map(), it = 15e3, at = 1200, ot = [429, 503], st = 2, ct = 4, lt = 0, ut = [];
function dt() {
	return new Promise((e) => {
		let t = () => {
			lt += 1, e(() => {
				--lt, ut.shift()?.();
			});
		};
		lt < ct ? t() : ut.push(t);
	});
}
var ft = (e) => ot.includes(e.status) || e.status === 0 && !e.timedOut;
function pt(e) {
	it = Number.isFinite(e) && e > 0 ? e : 15e3;
}
var A = class extends Error {
	constructor(e, { url: t, status: n = 0, timedOut: r = !1 } = {}) {
		super(e), this.name = "GbifApiError", this.url = t, this.status = n, this.timedOut = r;
	}
};
function j(e, t, n = {}) {
	let r = new URL(e.endsWith("/") ? e : `${e}/`, globalThis.location?.href), i = new URL(t.replace(/^\/+/, ""), r);
	for (let [e, t] of Object.entries(n)) {
		let n = Array.isArray(t) ? t : [t];
		for (let t of n) t != null && t !== "" && i.searchParams.append(e, String(t));
	}
	return i.toString();
}
async function mt(e) {
	let { url: t, init: n } = e, r = await dt(), i = new AbortController(), a = setTimeout(() => i.abort(), it);
	try {
		let e = await fetch(t, {
			...n,
			headers: {
				Accept: "application/json",
				...n?.headers
			},
			signal: i.signal
		});
		if (!e.ok) throw new A(`HTTP ${e.status}`, {
			url: t,
			status: e.status
		});
		let r;
		try {
			r = await e.json();
		} catch {
			throw new A("The answer was not JSON", {
				url: t,
				status: e.status || 200
			});
		}
		return r;
	} catch (e) {
		throw e instanceof A ? e : i.signal.aborted ? new A("Request timed out", {
			url: t,
			timedOut: !0
		}) : new A(e.message || "Network error", { url: t });
	} finally {
		clearTimeout(a), r();
	}
}
async function ht(e) {
	for (let t = 0;; t += 1) try {
		return await mt(e);
	} catch (e) {
		if (t >= st || !ft(e)) throw e;
		await new Promise((e) => setTimeout(e, at * 2 ** t * (1 + Math.random() * .5)));
	}
}
function gt(e, t) {
	let n = k.get(e);
	if (n) return n;
	let r = ht(t).catch((t) => {
		throw k.get(e) === r && k.delete(e), t;
	});
	return k.set(e, r), k.size > rt && k.delete(k.keys().next().value), r;
}
function M(e) {
	return gt(e, { url: e });
}
function _t(e, t) {
	let n = JSON.stringify(t);
	return gt(`POST ${e} ${n}`, {
		url: e,
		init: {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: n
		}
	});
}
// src/shared/config.js
var N = {
	apiBase: "https://api.gbif.org",
	siteBase: "https://www.gbif.org",
	checklistKey: "7ddf754f-d193-4cc9-b351-99906754a03b",
	timeoutMs: 15e3,
	showSource: !0
}, P = {}, vt = /* @__PURE__ */ new Set(), yt = () => JSON.stringify(Object.keys(N).map((e) => P[e] ?? N[e]));
function bt(e) {
	return vt.add(e), () => vt.delete(e);
}
function xt(e = {}) {
	let t = yt();
	for (let t of Object.keys(N)) t in e && (e[t] === null || e[t] === void 0 ? delete P[t] : P[t] = e[t]);
	if (pt(P.timeoutMs ?? N.timeoutMs), yt() !== t) for (let e of [...vt]) e();
}
var St = (e) => String(e).replace(/\/+$/, "");
function Ct(e) {
	try {
		return new URL(e, globalThis.location?.href).href;
	} catch {
		return e;
	}
}
function F(e = {}) {
	return {
		apiBase: St(Ct(e.apiBase || P.apiBase || N.apiBase)),
		siteBase: St(Ct(e.siteBase || P.siteBase || N.siteBase)),
		checklistKey: e.checklistKey || P.checklistKey || N.checklistKey,
		showSource: e.hideSource ? !1 : P.showSource ?? N.showSource
	};
}
// src/shared/format.js
var wt = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
};
function Tt(e = "") {
	return String(e).replace(/[&<>"']/g, (e) => wt[e]);
}
function Et(e = "") {
	return Tt(e).replace(/&lt;(\/?)(i|em)&gt;/gi, "<$1$2>").replace(/&amp;(amp|lt|gt|quot|#39);/g, "&$1;");
}
function I(e) {
	if (typeof e != "string") return null;
	try {
		let t = new URL(e.trim());
		return t.protocol === "http:" || t.protocol === "https:" ? t.href : null;
	} catch {
		return null;
	}
}
var Dt = {
	cc0: "CC0",
	pdm: "Public Domain",
	"cc-by": "CC BY",
	"cc-by-sa": "CC BY-SA",
	"cc-by-nd": "CC BY-ND",
	"cc-by-nc": "CC BY-NC",
	"cc-by-nc-sa": "CC BY-NC-SA",
	"cc-by-nc-nd": "CC BY-NC-ND",
	unknown: "Unknown licence"
}, Ot = {
	commercial: [
		"cc0",
		"pdm",
		"cc-by",
		"cc-by-sa",
		"cc-by-nd"
	],
	derivatives: [
		"cc0",
		"pdm",
		"cc-by",
		"cc-by-sa",
		"cc-by-nc",
		"cc-by-nc-sa"
	]
}, kt = /* @__PURE__ */ new Set(["creativecommons.org", "www.creativecommons.org"]);
function At(e) {
	let t = I(e) && new URL(e.trim());
	if (!t || !kt.has(t.hostname)) return null;
	let n = /^\/licenses\/([a-z-]+)\/([0-9.]+)\/?/i.exec(t.pathname);
	if (n) {
		let e = n[1].toLowerCase();
		return {
			key: Dt[`cc-${e}`] ? `cc-${e}` : "unknown",
			label: `CC ${e.toUpperCase()} ${n[2]}`,
			url: t.href
		};
	}
	let r = /^\/publicdomain\/zero\/([0-9.]+)\/?/i.exec(t.pathname);
	if (r) return {
		key: "cc0",
		label: `CC0 ${r[1]}`,
		url: t.href
	};
	let i = /^\/publicdomain\/mark\/([0-9.]+)\/?/i.exec(t.pathname);
	return i ? {
		key: "pdm",
		label: `Public Domain ${i[1]}`,
		url: t.href
	} : null;
}
function L(e) {
	let t = I(e);
	if (!t) return null;
	let n = At(t);
	if (n) return n;
	let r = new URL(t);
	return {
		key: "unknown",
		label: `${r.host}${r.pathname}`.replace(/\/$/, ""),
		url: t
	};
}
function jt(e) {
	if (!e || typeof e != "string") return null;
	let t = /* @__PURE__ */ new Set();
	for (let n of e.toLowerCase().split(/[\s,]+/).filter(Boolean)) {
		if (n === "all") return null;
		Ot[n] ? Ot[n].forEach((e) => t.add(e)) : Dt[n] && t.add(n);
	}
	return t.size ? t : null;
}
function Mt(e = "") {
	return String(e).toLowerCase().replace(/_/g, " ");
}
function Nt(e = "") {
	let t = Mt(e);
	return t.charAt(0).toUpperCase() + t.slice(1);
}
function R(e, { min: t = 1, max: n = 300, fallback: r }) {
	let i = Math.floor(Number(e));
	return Number.isFinite(i) ? Math.min(n, Math.max(t, i)) : r;
}
// src/shared/styles.js
var Pt = s`
  :host {
    display: block;
    box-sizing: border-box;
    /* In a grid or flex layout a wide table would otherwise stretch its column (and the page) instead of scrolling. */
    min-width: 0;
    /* The labels are English, so they read left to right even on a right-to-left page. Values the publisher wrote
       (names, places, remarks) take their own direction: see \`unicode-bidi: plaintext\` on the cells. */
    direction: ltr;
  }
  :host([hidden]) {
    display: none;
  }
  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
  a {
    color: var(--gbif-color-link, var(--gbif-color-accent, #357a1f));
  }
  .gbif-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`, Ft = s`
  .gbif-card {
    display: block;
    background: var(--gbif-color-surface, #fff);
    color: var(--gbif-color-text, #1f2933);
    font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
    font-size: var(--gbif-font-size, 0.875rem);
    line-height: 1.45;
    border: 1px solid var(--gbif-color-border, #d5dbe1);
    border-radius: var(--gbif-radius, 8px);
    overflow: hidden;
  }
  .gbif-card__header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem var(--gbif-card-padding, 1rem);
    border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
  }
  .gbif-card__badge {
    /* --gbif-badge-display: none hides it, for a page that credits GBIF in its footer instead (see the README). */
    display: var(--gbif-badge-display, inline-block);
    flex: none;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: var(--gbif-color-accent, #357a1f);
    color: var(--gbif-color-accent-text, #fff);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .gbif-card__title {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .gbif-card__body {
    padding: var(--gbif-card-padding, 1rem);
  }
  .gbif-card__state {
    margin: 0;
    color: var(--gbif-color-muted, #596273);
  }
  .gbif-card__footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem 0.75rem;
    padding: 0.5rem var(--gbif-card-padding, 1rem);
    border-top: 1px solid var(--gbif-color-border, #d5dbe1);
    color: var(--gbif-color-muted, #596273);
    font-size: 0.75rem;
  }
  .gbif-card__source {
    flex-basis: 100%;
    margin: 0;
  }
  .gbif-button {
    display: inline-block;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--gbif-color-control-border, #7d8794);
    border-radius: 4px;
    background: var(--gbif-color-surface, #fff);
    color: var(--gbif-color-text, #1f2933);
    font: inherit;
    font-size: 0.75rem;
    text-decoration: none;
    cursor: pointer;
  }
  .gbif-button:hover:not([aria-disabled='true']) {
    background: var(--gbif-color-surface-hover, #f2f4f7);
  }
  .gbif-button[aria-disabled='true'] {
    opacity: 0.45;
    cursor: default;
  }
  .gbif-button--primary {
    border-color: var(--gbif-color-accent, #357a1f);
    background: var(--gbif-color-accent, #357a1f);
    color: var(--gbif-color-accent-text, #fff);
  }
  .gbif-button--primary:hover:not([aria-disabled='true']) {
    background: var(--gbif-color-accent-hover, #2c6a1a);
  }
  .gbif-card__retry {
    margin-top: 0.5rem;
  }
  :focus-visible {
    outline: 2px solid var(--gbif-color-focus, #1d6fdc);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation: none !important;
    }
  }

  /* Printers drop backgrounds by default, which would leave white text on white. */
  @media print {
    .gbif-card__badge,
    .gbif-button--primary {
      background: none;
      color: #000;
      border: 1px solid #000;
    }
  }
`, It = class extends E {
	static properties = {
		heading: { type: String },
		headingLevel: {
			type: Number,
			attribute: "heading-level"
		},
		hideSource: {
			type: Boolean,
			attribute: "hide-source"
		}
	};
	static styles = [Pt, Ft];
	connectedCallback() {
		super.connectedCallback(), this.hasAttribute("lang") || this.setAttribute("lang", "en"), this._stopWatchingConfig = bt(() => this.onConfigChange());
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._stopWatchingConfig?.();
	}
	onConfigChange() {
		this.requestUpdate();
	}
	get config() {
		return F(this);
	}
	renderTitle(e) {
		return b`<div class="gbif-card__title" role="heading" aria-level=${R(this.headingLevel, {
			min: 1,
			max: 6,
			fallback: 2
		})} part="title">${e}</div>`;
	}
	renderSource(e) {
		return this.config.showSource ? b`<p class="gbif-card__source" part="source">${e}</p>` : S;
	}
}, Lt = [
	"EXACT",
	"VARIANT",
	"CANONICAL",
	"FUZZY",
	"HIGHERRANK"
], Rt = 80;
function zt(e) {
	let t = e?.diagnostics?.matchType, n = e?.diagnostics?.confidence ?? 0;
	return !!e?.usage?.key && Lt.includes(t) && n >= Rt;
}
function Bt(e) {
	return {
		key: e.taxonID,
		name: e.scientificName,
		canonicalName: e.scientificName,
		authorship: e.scientificNameAuthorship,
		rank: e.taxonRank,
		status: e.taxonomicStatus,
		formattedName: e.label || e.scientificName,
		acceptedKey: e.acceptedNameUsageID,
		parentKey: e.parentNameUsageID
	};
}
function Vt(e) {
	return !!e.acceptedKey && e.acceptedKey !== e.key;
}
function Ht(e) {
	return (Array.isArray(e) ? e : []).filter((e) => e && e.taxonID).map((e) => ({
		key: e.taxonID,
		name: e.scientificName,
		rank: e.taxonRank,
		speciesCount: e.species
	}));
}
var Ut = (e, t) => `/v2/taxon/${encodeURIComponent(e)}/${encodeURIComponent(t)}`, Wt = (e, t) => `/v2/taxon/tree/${encodeURIComponent(e)}/${encodeURIComponent(t)}`, Gt = (e = {}) => ({
	found: !1,
	...e
});
async function Kt(e) {
	try {
		return await M(e);
	} catch (e) {
		if (e.status === 404) return null;
		throw e;
	}
}
async function qt({ apiBase: e, checklistKey: t, taxonKey: n, scientificName: r, kingdom: i, rank: a }) {
	let o = n, s = {};
	if (!o) {
		let n = await M(j(e, "/v2/species/match", {
			scientificName: r,
			kingdom: i,
			rank: a,
			checklistKey: t
		}));
		if (s = {
			matchType: n?.diagnostics?.matchType,
			confidence: n?.diagnostics?.confidence
		}, !zt(n)) return Gt(s);
		o = n.usage.key;
	}
	let c = j(e, Ut(t, o)), l = Kt(j(e, Wt(t, o)));
	l.catch(() => {});
	let u = await Kt(c);
	if (!u || !u.taxonID) return Gt(s);
	let d = Bt(u), ee = d, te = Vt(d);
	if (te) {
		let n = await Kt(j(e, Ut(t, d.acceptedKey)));
		if (!n || !n.taxonID) return Gt(s);
		ee = Bt(n);
	}
	return {
		found: !0,
		url: c,
		isSynonym: te,
		usage: d,
		target: ee,
		classification: Ht(await l),
		...s
	};
}
async function Jt({ apiBase: e, checklistKey: t }) {
	try {
		let n = await M(j(e, `/v2/taxon/checklist/${encodeURIComponent(t)}`));
		return !n || typeof n != "object" ? null : {
			title: typeof n.title == "string" ? n.title : void 0,
			version: typeof n.version == "string" ? n.version : void 0,
			alias: typeof n.alias == "string" ? n.alias : void 0,
			url: typeof n.url == "string" ? n.url : void 0
		};
	} catch {
		return null;
	}
}
// src/shared/events.js
function z(e, t, n, { cancelable: r = !1 } = {}) {
	let i = new CustomEvent(t, {
		detail: n,
		bubbles: !0,
		composed: !0,
		cancelable: r
	});
	return e.dispatchEvent(i), i;
}
function B(e, t, n, r) {
	if (t.defaultPrevented || t.button !== 0 || t.metaKey || t.ctrlKey || t.shiftKey || t.altKey) return null;
	let i = z(e, n, r, { cancelable: !0 });
	return i.defaultPrevented && t.preventDefault(), i;
}
// src/shared/taxon-element.js
var Yt = [
	"taxonKey",
	"scientificName",
	"kingdom",
	"rank",
	"checklistKey",
	"apiBase"
], V = class extends It {
	static properties = {
		taxonKey: {
			type: String,
			attribute: "taxon-key",
			reflect: !0
		},
		scientificName: {
			type: String,
			attribute: "scientific-name"
		},
		kingdom: { type: String },
		rank: { type: String },
		checklistKey: {
			type: String,
			attribute: "checklist-key"
		},
		apiBase: {
			type: String,
			attribute: "api-base"
		},
		siteBase: {
			type: String,
			attribute: "site-base"
		},
		reserveSpace: {
			type: Boolean,
			attribute: "reserve-space"
		},
		_taxon: { state: !0 }
	};
	static dataProperties = [];
	constructor() {
		super(), this._taxon = { status: "idle" }, this._runId = 0;
	}
	willUpdate(e) {
		if (Yt.some((t) => e.has(t))) this._resolve();
		else if (this.constructor.dataProperties.some((t) => e.has(t)) && this._taxon.status === "ready") {
			let e = this._runId;
			this.onTaxonReset(), this.onTaxonReady(this._taxon, () => e === this._runId);
		}
	}
	onConfigChange() {
		this.taxonKey || this.scientificName ? this._resolve() : super.onConfigChange();
	}
	async _resolve() {
		let e = ++this._runId, t = () => e === this._runId;
		this.onTaxonReset();
		let { taxonKey: n, scientificName: r, kingdom: i, rank: a } = this;
		if (!n && !r) this._taxon = { status: "idle" };
		else {
			this._taxon = { status: "loading" };
			try {
				let e = await qt({
					...this.config,
					taxonKey: n,
					scientificName: r,
					kingdom: i,
					rank: a
				});
				if (!t()) return;
				if (!e.found) {
					let t = n || r;
					this._taxon = {
						status: "nomatch",
						query: t,
						byKey: !!n
					}, z(this, "gbif-taxon-notfound", {
						query: t,
						byKey: !!n,
						matchType: e.matchType,
						confidence: e.confidence,
						checklistKey: this.config.checklistKey
					});
					return;
				}
				this._taxon = {
					status: "ready",
					...e
				}, z(this, "gbif-taxon-resolved", {
					taxonKey: e.target.key,
					scientificName: e.target.name,
					rank: e.target.rank,
					isSynonym: e.isSynonym,
					matchType: e.matchType,
					confidence: e.confidence,
					checklistKey: this.config.checklistKey
				}), this.onTaxonReady(this._taxon, t);
			} catch (e) {
				if (!t()) return;
				this._taxon = { status: "error" }, this.reportError(e);
			}
		}
	}
	reportError(e) {
		z(this, "gbif-error", {
			component: this.localName,
			url: e.url,
			status: e.status ?? 0,
			message: e.message
		});
	}
	get displayName() {
		return this._taxon.target?.canonicalName || this._taxon.target?.name || this.scientificName || "";
	}
	renderReserved(e, t) {
		return this.reserveSpace && t ? b`<div class="gbif-card" part="card" ${nt((t) => t && (t.style.minHeight = e))} aria-hidden="true"></div>` : S;
	}
	onTaxonReset() {}
	onTaxonReady() {}
};
// src/shared/links.js
function Xt(e, t) {
	return `${e}/taxon/${encodeURIComponent(t)}`;
}
function H(e, t) {
	return `${e}/occurrence/${encodeURIComponent(t)}`;
}
function Zt(e, t = {}) {
	return j(e, "/occurrence/search", t);
}
// src/components/gbif-taxon-card.js
var Qt = class extends V {
	static properties = {
		...V.properties,
		followSelection: {
			type: Boolean,
			attribute: "follow-selection"
		},
		_count: { state: !0 },
		_checklist: { state: !0 }
	};
	static styles = [...V.styles, s`
      .gbif-taxon-card__name {
        margin: 0 0 0.5rem;
        font-size: 1.15rem;
      }
      .gbif-taxon-card__note {
        margin: 0 0 0.5rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.8rem;
      }
      .gbif-taxon-card__classification {
        display: flex;
        flex-wrap: wrap;
        gap: 0.2rem 0.1rem;
        margin: 0 0 0.75rem;
        padding: 0;
        list-style: none;
        font-size: 0.8rem;
      }
      .gbif-taxon-card__ancestor::after {
        content: '›';
        margin: 0 0.35rem;
        color: var(--gbif-color-muted, #596273);
      }
      .gbif-taxon-card__ancestor:last-child::after {
        content: '';
        margin: 0;
      }
      .gbif-taxon-card__rank-label {
        margin-right: 0.25rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .gbif-taxon-card__rank-link {
        text-decoration: none;
      }
      .gbif-taxon-card__rank-link:hover .gbif-taxon-card__rank-name {
        text-decoration: underline;
      }
      .gbif-taxon-card__current {
        font-weight: 600;
      }
      .gbif-taxon-card__count {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
      }
      .gbif-taxon-card__view {
        margin-left: auto;
      }
    `];
	constructor() {
		super(), this._count = null, this._checklist = null;
	}
	onTaxonReset() {
		this._count = null, this._checklist = null;
	}
	async onTaxonReady(e, t) {
		let { apiBase: n, checklistKey: r, showSource: i } = this.config;
		i && Jt({
			apiBase: n,
			checklistKey: r
		}).then((e) => {
			t() && (this._checklist = e);
		});
		let a = j(n, "/v1/occurrence/search", {
			taxonKey: e.target.key,
			checklistKey: r,
			limit: 0
		});
		try {
			let e = await M(a);
			t() && (this._count = typeof e?.count == "number" ? e.count : void 0);
		} catch (e) {
			if (!t()) return;
			this._count = void 0, this.reportError(e);
		}
	}
	_taxonDetail(e, t) {
		return {
			taxonKey: e.key,
			scientificName: e.name,
			rank: e.rank,
			checklistKey: this.config.checklistKey,
			source: t
		};
	}
	_onRankClick(e, t) {
		let n = B(this, e, "gbif-taxon-select", this._taxonDetail(t, "classification"));
		n && !n.defaultPrevented && this.followSelection && (e.preventDefault(), this.scientificName = void 0, this.taxonKey = t.key);
	}
	_renderMatchNote(e) {
		return e.matchType === "HIGHERRANK" ? b`<p class="gbif-taxon-card__note">
        Matched to the nearest higher taxon found for “${this.scientificName}”.
      </p>` : e.matchType === "VARIANT" ? b`<p class="gbif-taxon-card__note">Matched “${this.scientificName}” as a spelling variant.</p>` : S;
	}
	_renderClassification(e, t) {
		return e.classification.length ? b`
      <ol class="gbif-taxon-card__classification" role="list" aria-label="Classification">
        ${e.classification.map((n) => {
			let r = b`<span class="gbif-taxon-card__rank-label">${Mt(n.rank)}</span>`;
			return n.key === e.target.key ? b`<li class="gbif-taxon-card__ancestor">
                <span class="gbif-taxon-card__current" aria-current="true"
                  >${r}<span class="gbif-taxon-card__rank-name">${n.name}</span></span
                >
              </li>` : b`<li class="gbif-taxon-card__ancestor">
                <a
                  class="gbif-taxon-card__rank-link"
                  href=${Xt(t, n.key)}
                  target="_blank"
                  rel="noopener"
                  @click=${(e) => this._onRankClick(e, n)}
                  >${r}<span class="gbif-taxon-card__rank-name">${n.name}</span></a
                >
              </li>`;
		})}
      </ol>
    ` : S;
	}
	_renderOccurrenceCount(e, t) {
		if (this._count === null) return b`<p class="gbif-taxon-card__count">Loading occurrences…</p>`;
		if (this._count === void 0) return b`<p class="gbif-taxon-card__count">Occurrence count unavailable.</p>`;
		let n = Zt(t.siteBase, {
			taxonKey: e.target.key,
			checklistKey: t.checklistKey
		});
		return b`<p class="gbif-taxon-card__count">
      <a href=${n} target="_blank" rel="noopener" @click=${(r) => B(this, r, "gbif-occurrences-select", {
			taxonKey: e.target.key,
			checklistKey: t.checklistKey,
			url: n,
			source: "count"
		})}
        ><strong>${this._count.toLocaleString()}</strong> occurrence${this._count === 1 ? "" : "s"}</a
      >
      in GBIF
    </p>`;
	}
	_renderSource() {
		let e = this._checklist, t = I(e?.url), n = [e?.title, e?.version].filter(Boolean).join(" ");
		return this.renderSource(b`
      ${n ? b`Taxonomy:
            ${t ? b`<a href=${t} target="_blank" rel="noopener">${n}</a>` : n}.` : S}
      Occurrence data from GBIF.
    `);
	}
	_renderBody() {
		let e = this._taxon, t = this.config;
		switch (e.status) {
			case "loading": return b`<p class="gbif-card__state" role="status">Loading…</p>`;
			case "error": return b`<p class="gbif-card__state" role="alert">Could not load this taxon from GBIF.</p>`;
			case "nomatch": return b`<p class="gbif-card__state">
          ${e.byKey ? b`No taxon with key <em>${e.query}</em> was found in this checklist.` : b`No confident match could be found on GBIF for <em>${e.query}</em>.`}
        </p>`;
			default: return b`
          <p class="gbif-taxon-card__name">${We(Et(e.target.formattedName || e.target.name))}</p>
          ${this._renderMatchNote(e)}
          ${e.isSynonym ? b`<p class="gbif-taxon-card__note">
                ${Nt(e.usage.status || "synonym")}:
                ${We(Et(e.usage.formattedName || e.usage.name))}
              </p>` : S}
          ${this._renderClassification(e, t.siteBase)} ${this._renderOccurrenceCount(e, t)}
        `;
		}
	}
	render() {
		let e = this._taxon;
		if (e.status === "idle") return S;
		let t = this.config;
		return b`
      <section class="gbif-card" part="card" aria-busy=${e.status === "loading" ? "true" : "false"}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || "This taxon in GBIF")}
        </header>
        <div class="gbif-card__body" part="body">${this._renderBody()}</div>
        ${e.status === "ready" ? b`<footer class="gbif-card__footer" part="footer">
              <a
                class="gbif-button gbif-button--primary gbif-taxon-card__view"
                href=${Xt(t.siteBase, e.target.key)}
                target="_blank"
                rel="noopener"
                @click=${(t) => B(this, t, "gbif-taxon-select", this._taxonDetail(e.target, "gbif-link"))}
                >View on GBIF.org</a
              >
              ${this._renderSource()}
            </footer>` : S}
      </section>
    `;
	}
}, $t = Ve(class extends He {
	constructor() {
		super(...arguments), this.key = S;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Je(e), this.key = t), n;
	}
}), en = /* @__PURE__ */ new Set(/* @__PURE__ */ "FAMILY.SUBFAMILY.INFRAFAMILY.SUPERTRIBE.TRIBE.SUBTRIBE.INFRATRIBE.SUPERGENUS.GENUS.SUBGENUS.INFRAGENUS.SECTION.SUBSECTION.SERIES.SUBSERIES.SPECIES_AGGREGATE.SPECIES.SUBSPECIES.INFRASUBSPECIFIC_NAME.VARIETY.SUBVARIETY.FORM.SUBFORM.CULTIVAR.CULTIVAR_GROUP.CONVARIETY.GREX.STRAIN.PATHOVAR.BIOVAR.CHEMOVAR.MORPHOVAR.PHAGOVAR.SEROVAR.FORMA_SPECIALIS.ABERRATION.RACE.NATIO.PROLES".split(".")), tn = /* @__PURE__ */ new Set(["SPECIES", "GENUS"]), nn = /* @__PURE__ */ "Paratype.Holotype.Type.Isotype.Syntype.OriginalMaterial.Lectotype.Isolectotype.Paralectotype.Isosyntype.Plastoisotype.Plastoneotype.Exsyntype.Exneotype.Exlectotype.Exepitype.Plastolectotype.Exparatype.Allolectotype.Exisotype.Exholotype.Plastosyntype.Clonotype.SupplementaryType.Plastoparatype.Metatype.Hapantotype.Isoepitype.Plastotype.Plastoholotype.Paraneotype.Extype.Alloneotype.Isoparatype.Paratopotype.Epitype.Plesiotype.Isoneotype.SecondaryType.TypeStrain.TypeSeries.Homeotype.Neotype.Cotype.Topotype.Allotype.Hypotype.Iconotype".split("."), rn = 300;
function an(e) {
	if (!e || typeof e != "object") return null;
	let t = I(e.identifier);
	if (!t) return null;
	let n = L(e.license);
	return {
		src: t,
		occurrenceKey: e.occurrenceKey == null ? void 0 : String(e.occurrenceKey),
		rightsHolder: typeof e.rightsHolder == "string" && e.rightsHolder.trim() ? e.rightsHolder.trim() : void 0,
		license: n,
		licenseKey: n?.key ?? "unknown"
	};
}
var on = class extends V {
	static properties = {
		...V.properties,
		limit: { type: Number },
		licenses: { type: String },
		_images: { state: !0 },
		_index: { state: !0 },
		_imageState: { state: !0 },
		_failed: { state: !0 },
		_loaded: { state: !0 }
	};
	static dataProperties = ["limit", "licenses"];
	static styles = [...V.styles, s`
      .gbif-media-gallery__viewer {
        position: relative;
        height: var(--gbif-gallery-height, 20rem);
        background: var(--gbif-color-media-background, #101418);
        outline-offset: -2px;
      }
      .gbif-media-gallery__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: opacity 150ms;
      }
      .gbif-media-gallery__image--hidden {
        opacity: 0;
      }
      .gbif-media-gallery__status {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        color: #fff;
        font-size: 0.8rem;
      }
      .gbif-media-gallery__nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 50%;
        background: rgb(255 255 255 / 0.92);
        color: #1f2933;
        font-size: 1.2rem;
        line-height: 1;
        cursor: pointer;
      }
      .gbif-media-gallery__nav--prev {
        left: 0.5rem;
      }
      .gbif-media-gallery__nav--next {
        right: 0.5rem;
      }
      .gbif-media-gallery__details {
        position: absolute;
        right: 0.5rem;
        bottom: 0.5rem;
        background: rgb(255 255 255 / 0.92);
        color: #1f2933;
      }
      .gbif-media-gallery__credit {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gbif-media-gallery__counter {
        flex: none;
      }
    `];
	constructor() {
		super(), this.limit = 20, this._images = [], this._index = 0, this._imageState = "loading", this._failed = !1, this._loaded = !1;
	}
	onTaxonReset() {
		this._images = [], this._index = 0, this._failed = !1, this._loaded = !1;
	}
	async onTaxonReady(e, t) {
		if (!en.has(e.target.rank)) {
			this._loaded = !0;
			return;
		}
		let { apiBase: n, checklistKey: r } = this.config, i = R(this.limit, {
			min: 1,
			max: rn,
			fallback: 20
		}), a = jt(this.licenses), o = j(n, `/v1/occurrence/experimental/multimedia/species/${encodeURIComponent(r)}/${encodeURIComponent(e.target.key)}`, {
			mediaType: "stillImage",
			limit: a ? rn : i,
			offset: 0
		});
		try {
			let e = await M(o);
			if (!t()) return;
			let n = Array.isArray(e?.results) ? e.results : [];
			this._images = n.map(an).filter((e) => e && (!a || a.has(e.licenseKey))).slice(0, i), this._imageState = "loading", this._loaded = !0;
		} catch (e) {
			if (!t()) return;
			this._failed = !0, this._loaded = !0, this.reportError(e);
		}
	}
	_go(e) {
		let t = this._images.length;
		this._index = (this._index + e + t) % t, this._imageState = "loading";
	}
	_onKeydown(e) {
		this._images.length < 2 || (e.key === "ArrowLeft" ? (e.preventDefault(), this._go(-1)) : e.key === "ArrowRight" && (e.preventDefault(), this._go(1)));
	}
	_onImageError(e) {
		this._imageState = "error", z(this, "gbif-error", {
			component: this.localName,
			url: e.src,
			status: 0,
			message: "Image failed to load"
		});
	}
	_renderCredit(e) {
		return b`
      ${e.rightsHolder || "Rights holder not stated"} ·
      ${e.license ? b`<a href=${e.license.url} target="_blank" rel="noopener">${e.license.label}</a>` : "Licence not stated"}
    `;
	}
	render() {
		let e = this._taxon, t = e.status === "loading" || e.status === "ready" && !this._loaded;
		if (e.status === "ready" && this._failed) return b`<section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || "Images")}
        </header>
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load images from GBIF.</p></div>
      </section>`;
		if (e.status !== "ready" || !this._images.length) return this.renderReserved("var(--gbif-gallery-height, 20rem)", t);
		let { siteBase: n, checklistKey: r } = this.config, i = this._images[this._index], a = this._images.length > 1, o = this.displayName, s = `${o ? `Image of ${o}` : "Image"}${i.rightsHolder ? ` by ${i.rightsHolder}` : ""}`, c = Zt(n, {
			taxonKey: e.target.key,
			checklistKey: r,
			view: "gallery"
		});
		return b`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || "Images")}
        </header>
        <div
          class="gbif-media-gallery__viewer"
          part="viewer"
          role="group"
          aria-roledescription="carousel"
          aria-label=${o ? `Images of ${o}` : "Images"}
          tabindex=${a ? "0" : S}
          @keydown=${this._onKeydown}
        >
          ${$t(`${this._index}:${i.src}`, b`<img
              class="gbif-media-gallery__image ${this._imageState === "loaded" ? "" : "gbif-media-gallery__image--hidden"}"
              src=${i.src}
              alt=${s}
              loading="lazy"
              referrerpolicy="no-referrer"
              @load=${() => this._imageState = "loaded"}
              @error=${() => this._onImageError(i)}
            />`)}
          ${this._imageState === "loading" ? b`<p class="gbif-media-gallery__status">Loading image…</p>` : S}
          ${this._imageState === "error" ? b`<p class="gbif-media-gallery__status" role="alert">Image failed to load</p>` : S}
          ${a ? b`
                <button type="button" class="gbif-media-gallery__nav gbif-media-gallery__nav--prev" aria-label="Previous image" @click=${() => this._go(-1)}>‹</button>
                <button type="button" class="gbif-media-gallery__nav gbif-media-gallery__nav--next" aria-label="Next image" @click=${() => this._go(1)}>›</button>
              ` : S}
          ${i.occurrenceKey ? b`<a
                class="gbif-button gbif-media-gallery__details"
                href=${H(n, i.occurrenceKey)}
                target="_blank"
                rel="noopener"
                @click=${(e) => B(this, e, "gbif-occurrence-select", {
			occurrenceKey: i.occurrenceKey,
			source: "media"
		})}
                >See details on GBIF.org</a
              >` : S}
        </div>
        <footer class="gbif-card__footer" part="footer">
          <span class="gbif-media-gallery__credit">${this._renderCredit(i)}</span>
          <span class="gbif-media-gallery__counter">
            ${this._index + 1} / ${this._images.length}
            <a
              href=${c}
              target="_blank"
              rel="noopener"
              @click=${(t) => B(this, t, "gbif-occurrences-select", {
			taxonKey: e.target.key,
			checklistKey: r,
			url: c,
			source: "gallery"
		})}
              >all</a
            >
          </span>
          ${this.renderSource("Images from GBIF occurrence records.")}
        </footer>
        <span class="gbif-visually-hidden" aria-live="polite">Image ${this._index + 1} of ${this._images.length}</span>
      </section>
    `;
	}
}, sn = {
	light: {
		label: "Light",
		style: "gbif-light"
	},
	classic: {
		label: "Classic",
		style: "gbif-classic"
	},
	dark: {
		label: "Dark",
		style: "gbif-dark"
	},
	geyser: {
		label: "Geyser",
		style: "gbif-geyser"
	},
	tuatara: {
		label: "Tuatara",
		style: "gbif-tuatara"
	},
	bright: {
		label: "Bright",
		style: "osm-bright"
	}
}, cn = "https://tile.gbif.org/3857/omt/{z}/{x}/{y}@1x.png?style=", ln = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, &copy; <a href=\"https://openmaptiles.org/\">OpenMapTiles</a>", un;
function dn() {
	return un ??= Promise.all([import("./chunks/leaflet-src.js").then((t) => /* @__PURE__ */ e(t.default, 1)), import("./chunks/leaflet.js")]).catch((e) => {
		throw un = void 0, e;
	}), un;
}
var fn = /* @__PURE__ */ new WeakSet();
function pn(e, t) {
	if (fn.has(e)) return;
	fn.add(e);
	let n = new CSSStyleSheet();
	n.replaceSync(t), e.adoptedStyleSheets = [...e.adoptedStyleSheets, n];
}
function mn({ basemap: e, basemapUrl: t, basemapAttribution: n } = {}) {
	return I(t?.replace(/\{[a-z]\}/gi, "x")) ? {
		url: t,
		attribution: n || "",
		custom: !0
	} : {
		url: `${cn}${(sn[e] || sn.light).style}`,
		attribution: ln,
		custom: !1
	};
}
// src/shared/geo.js
var U = (e) => Math.round(e * 1e4) / 1e4, hn = (e, t, n) => Math.min(n, Math.max(t, e)), gn = (e) => ((e + 180) % 360 + 360) % 360 - 180;
function _n({ west: e, east: t, south: n, north: r }) {
	let i = U(hn(n, -90, 90)), a = U(hn(r, -90, 90)), o = (e, t) => [
		[e, i],
		[t, i],
		[t, a],
		[e, a],
		[e, i]
	].map(([e, t]) => `${e} ${t}`).join(", "), s = t - e;
	if (s >= 360) return {
		geometry: `POLYGON((${o(-180, 180)}))`,
		bounds: {
			south: i,
			north: a,
			west: -180,
			east: 180
		}
	};
	let c = U(gn(e)), l = U(c + s);
	if (l <= 180) return {
		geometry: `POLYGON((${o(c, l)}))`,
		bounds: {
			south: i,
			north: a,
			west: c,
			east: l
		}
	};
	let u = U(l - 360);
	return {
		geometry: `MULTIPOLYGON(((${o(c, 180)})),((${o(-180, u)})))`,
		bounds: {
			south: i,
			north: a,
			west: c,
			east: u
		}
	};
}
// src/components/gbif-occurrence-map.js
var vn = class extends V {
	static properties = {
		...V.properties,
		basemap: { type: String },
		basemapUrl: {
			type: String,
			attribute: "basemap-url"
		},
		basemapAttribution: {
			type: String,
			attribute: "basemap-attribution"
		},
		_total: { state: !0 },
		_failed: { state: !0 }
	};
	static styles = [...V.styles, s`
      .gbif-occurrence-map__viewport {
        position: relative;
        height: var(--gbif-map-height, 24rem);
        isolation: isolate;
        background: var(--gbif-color-media-background, #e6ebf0);
      }
      .gbif-occurrence-map__canvas {
        position: absolute;
        inset: 0;
      }
      .gbif-occurrence-map__explore,
      .gbif-occurrence-map__basemap {
        position: absolute;
        z-index: 1000;
        background: var(--gbif-color-surface, #fff);
        color: var(--gbif-color-text, #1f2933);
      }
      .gbif-occurrence-map__explore {
        left: 0.5rem;
        bottom: 1.6rem;
      }
      .gbif-occurrence-map__basemap {
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.25rem;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 4px;
        font: inherit;
        font-size: 0.75rem;
      }
    `];
	constructor() {
		super(), this.basemap = "light", this._total = null, this._failed = !1, this._map = null, this._leaflet = null, this._occurrenceLayer = null, this._basemapLayer = null, this._layerKey = null, this._resizeObserver = null, this._initializing = !1;
	}
	onTaxonReset() {
		this._total = null, this._failed = !1, this._destroyMap();
	}
	async onTaxonReady(e, t) {
		let { apiBase: n, checklistKey: r } = this.config, i = j(n, "/v2/map/occurrence/density/capabilities.json", {
			taxonKey: e.target.key,
			checklistKey: r
		});
		try {
			let e = await M(i);
			t() && (this._total = typeof e?.total == "number" ? e.total : 0);
		} catch (e) {
			if (!t()) return;
			this._total = 0, this._failed = !0, this.reportError(e);
		}
	}
	connectedCallback() {
		super.connectedCallback(), this.hasUpdated && this.requestUpdate();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._destroyMap();
	}
	updated(e) {
		this._total > 0 && this._taxon.status === "ready" && (this._map && (e.has("basemap") || e.has("basemapUrl") || e.has("basemapAttribution")) && this._applyBasemap(), this._syncMap());
	}
	async _syncMap() {
		let e = this.renderRoot.querySelector(".gbif-occurrence-map__canvas"), t = this._taxon.target?.key;
		if (!e || !t) return;
		if (this._map && this._map.getContainer() !== e && this._destroyMap(), this._map) {
			this._layerKey !== t && this._applyOccurrenceLayer();
			return;
		}
		if (this._initializing) return;
		this._initializing = !0;
		let n = this._runId;
		try {
			let [{ default: e }, { default: t }] = await dn(), r = this.renderRoot.querySelector(".gbif-occurrence-map__canvas");
			if (n !== this._runId || !this.isConnected || !r || this._map) return;
			pn(this.renderRoot, t), this._leaflet = e;
			let i = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			this._map = e.map(r, {
				center: [20, 0],
				zoom: 1,
				minZoom: 1,
				worldCopyJump: !0,
				scrollWheelZoom: !1,
				zoomAnimation: !i,
				fadeAnimation: !i
			}), this._applyBasemap(), this._applyOccurrenceLayer(), this._resizeObserver = new ResizeObserver(() => this._map?.invalidateSize()), this._resizeObserver.observe(r);
		} catch (e) {
			this._failed = !0, this.reportError(e);
		} finally {
			this._initializing = !1, !this._map && !this._failed && this.isConnected && this._total > 0 && this.requestUpdate();
		}
	}
	_applyBasemap() {
		let { url: e, attribution: t } = mn(this);
		this._basemapLayer?.remove(), this._basemapLayer = this._leaflet.tileLayer(e, {
			attribution: t,
			maxZoom: 18
		}).addTo(this._map), this._occurrenceLayer?.bringToFront();
	}
	_applyOccurrenceLayer() {
		let e = this._leaflet, { apiBase: t, checklistKey: n } = this.config, r = this._taxon.target.key, i = new URLSearchParams({
			style: "classic.poly",
			bin: "hex",
			hexPerTile: "70",
			taxonKey: r,
			checklistKey: n,
			srs: "EPSG:3857"
		});
		this._occurrenceLayer?.remove(), this._occurrenceLayer = e.tileLayer(`${t}/v2/map/occurrence/density/{z}/{x}/{y}@2x.png?${i}`, {
			attribution: "Occurrences &copy; <a href=\"https://www.gbif.org\">GBIF</a>",
			maxZoom: 18
		}).addTo(this._map), this._layerKey = r;
	}
	_destroyMap() {
		this._resizeObserver?.disconnect(), this._resizeObserver = null, this._map?.remove(), this._map = null, this._occurrenceLayer = null, this._basemapLayer = null, this._layerKey = null;
	}
	_onExplore() {
		if (!this._map) return;
		let e = this._map.getBounds(), { geometry: t, bounds: n } = _n({
			west: e.getWest(),
			east: e.getEast(),
			south: e.getSouth(),
			north: e.getNorth()
		}), r = Zt(this.config.siteBase, {
			taxonKey: this._taxon.target.key,
			checklistKey: this.config.checklistKey,
			geometry: t
		});
		z(this, "gbif-map-explore", {
			bounds: n,
			geometry: t,
			url: r
		}, { cancelable: !0 }).defaultPrevented || window.open(r, "_blank", "noopener");
	}
	render() {
		let e = this._taxon, t = e.status === "loading" || e.status === "ready" && this._total === null;
		if (e.status === "ready" && this._failed) return b`<section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || "Occurrence map")}
        </header>
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load the occurrence map from GBIF.</p></div>
      </section>`;
		if (e.status !== "ready" || !(this._total > 0)) return this.renderReserved("var(--gbif-map-height, 24rem)", t);
		let n = this.displayName, r = mn(this).custom;
		return b`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || "Occurrence map")}
        </header>
        <div class="gbif-occurrence-map__viewport" part="viewport">
          <div
            class="gbif-occurrence-map__canvas"
            role="region"
            aria-label=${n ? `Map of GBIF occurrences of ${n}` : "Map of GBIF occurrences"}
          ></div>
          <button type="button" class="gbif-button gbif-occurrence-map__explore" @click=${this._onExplore}>
            Explore on GBIF.org
          </button>
          ${r ? S : b`<select
                class="gbif-occurrence-map__basemap"
                aria-label="Basemap"
                @change=${(e) => this.basemap = e.target.value}
              >
                ${Object.entries(sn).map(([e, t]) => b`<option value=${e} ?selected=${e === this.basemap}>${t.label}</option>`)}
              </select>`}
        </div>
        <footer class="gbif-card__footer" part="footer">
          <span>${this._total.toLocaleString()} georeferenced occurrences</span>
          ${this.renderSource("Occurrence data from GBIF.")}
        </footer>
      </section>
    `;
	}
}, yn = class extends V {
	static properties = {
		...V.properties,
		pageSize: {
			type: Number,
			attribute: "page-size"
		},
		_rows: { state: !0 },
		_total: { state: !0 },
		_page: { state: !0 },
		_loading: { state: !0 },
		_failed: { state: !0 },
		_pageError: { state: !0 }
	};
	static dataProperties = ["pageSize"];
	static styles = [...V.styles, s`
      .gbif-type-specimens__list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .gbif-type-specimens__item + .gbif-type-specimens__item {
        border-top: 1px solid var(--gbif-color-border, #d5dbe1);
      }
      .gbif-type-specimens__link {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.25rem 0.6rem;
        padding: 0.4rem 0;
        color: inherit;
        text-decoration: none;
      }
      .gbif-type-specimens__link:hover .gbif-type-specimens__name {
        text-decoration: underline;
      }
      .gbif-type-specimens__status {
        flex: none;
        padding: 0.05rem 0.4rem;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 4px;
        background: var(--gbif-color-surface-hover, #f2f4f7);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .gbif-type-specimens__name {
        flex: 1;
      }
      .gbif-type-specimens__meta {
        flex: none;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-type-specimens__pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.6rem;
        font-size: 0.75rem;
      }
      .gbif-type-specimens__error {
        margin: 0.5rem 0 0;
        color: var(--gbif-color-error, #a32020);
        font-size: 0.8rem;
      }
    `];
	constructor() {
		super(), this.pageSize = 10, this._rows = [], this._total = 0, this._page = 0, this._loading = !1, this._failed = !1, this._pageError = !1;
	}
	get _size() {
		return R(this.pageSize, {
			min: 1,
			max: 300,
			fallback: 10
		});
	}
	get _pageCount() {
		return Math.max(1, Math.ceil(this._total / this._size));
	}
	onTaxonReset() {
		this._rows = [], this._total = 0, this._page = 0, this._loading = !1, this._failed = !1, this._pageError = !1;
	}
	onTaxonReady(e, t) {
		if (tn.has(e.target.rank)) return this._loadPage(0, t);
	}
	async _loadPage(e, t = () => !0) {
		let { apiBase: n, checklistKey: r } = this.config, i = this._size, a = j(n, "/v1/occurrence/search", {
			checklistKey: r,
			taxonKey: this._taxon.target.key,
			limit: i,
			offset: e * i,
			typeStatus: nn
		});
		this._loading = !0, this._pageError = !1;
		try {
			let n = await M(a);
			if (!t()) return;
			this._rows = (Array.isArray(n?.results) ? n.results : []).filter((e) => e && typeof e == "object"), this._total = typeof n?.count == "number" ? n.count : 0, this._page = e;
		} catch (e) {
			if (!t()) return;
			this._rows.length ? this._pageError = !0 : this._failed = !0, this.reportError(e);
		} finally {
			t() && (this._loading = !1);
		}
	}
	_goTo(e) {
		if (e < 0 || e >= this._pageCount || this._loading) return;
		let t = this._runId;
		this._loadPage(e, () => t === this._runId);
	}
	_onRowClick(e, t) {
		B(this, e, "gbif-occurrence-select", {
			occurrenceKey: String(t.key),
			source: "type-specimens"
		});
	}
	_rowName(e) {
		let { checklistKey: t } = this.config, n = e.classifications?.[t]?.usage?.name || e.scientificName || e.verbatimScientificName;
		return typeof n == "string" && n ? n : "—";
	}
	_rowStatus(e) {
		return Array.isArray(e.typeStatus) ? e.typeStatus.join(", ") : e.typeStatus;
	}
	_renderPager() {
		let e = this._pageCount - 1;
		return b`<div class="gbif-type-specimens__pager">
      <button
        type="button"
        class="gbif-button"
        aria-disabled=${this._page === 0 || this._loading ? "true" : "false"}
        @click=${() => this._goTo(this._page - 1)}
      >
        ‹ Prev
      </button>
      <span>Page ${this._page + 1} of ${this._pageCount}</span>
      <button
        type="button"
        class="gbif-button"
        aria-disabled=${this._page >= e || this._loading ? "true" : "false"}
        @click=${() => this._goTo(this._page + 1)}
      >
        Next ›
      </button>
    </div>`;
	}
	render() {
		let e = this._taxon;
		if (e.status !== "ready" || !tn.has(e.target.rank)) return S;
		if (this._failed) return b`<section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || "Type specimens")}
        </header>
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load type specimens from GBIF.</p></div>
      </section>`;
		if (!this._rows.length) return S;
		let { siteBase: t } = this.config;
		return b`
      <section class="gbif-card" part="card" aria-busy=${this._loading ? "true" : "false"}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(`${this.heading || "Type specimens"} (${this._total.toLocaleString()})`)}
        </header>
        <div class="gbif-card__body" part="body">
          <ul class="gbif-type-specimens__list">
            ${this._rows.map((e) => {
			let n = [
				e.country,
				e.institutionCode && `${e.institutionCode} ${e.catalogNumber ?? ""}`.trim(),
				e.eventDate
			].filter((e) => typeof e == "string" && e).join(" · ");
			return b`<li class="gbif-type-specimens__item">
                <a
                  class="gbif-type-specimens__link"
                  href=${H(t, e.key)}
                  target="_blank"
                  rel="noopener"
                  @click=${(t) => this._onRowClick(t, e)}
                >
                  <span class="gbif-type-specimens__status">${this._rowStatus(e)}</span>
                  <span class="gbif-type-specimens__name">${this._rowName(e)}</span>
                  ${n ? b`<span class="gbif-type-specimens__meta">${n}</span>` : S}
                </a>
              </li>`;
		})}
          </ul>
          ${this._pageError ? b`<p class="gbif-type-specimens__error" role="alert">Could not load that page. Showing the previous one.</p>` : S}
          ${this._pageCount > 1 ? this._renderPager() : S}
          <span class="gbif-visually-hidden" aria-live="polite">Page ${this._page + 1} of ${this._pageCount}</span>
        </div>
        ${this.config.showSource ? b`<footer class="gbif-card__footer" part="footer">${this.renderSource("Occurrence data from GBIF.")}</footer>` : S}
      </section>
    `;
	}
}, bn = class extends E {
	static properties = {
		checklistKey: {
			type: String,
			attribute: "checklist-key"
		},
		hideTaxonomy: {
			type: Boolean,
			attribute: "hide-taxonomy"
		},
		apiBase: {
			type: String,
			attribute: "api-base"
		},
		siteBase: {
			type: String,
			attribute: "site-base"
		},
		_checklist: { state: !0 }
	};
	static styles = [Pt, s`
      .gbif-attribution {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: var(--gbif-font-size, 0.875rem);
        line-height: 1.45;
      }
    `];
	constructor() {
		super(), this._checklist = null;
	}
	connectedCallback() {
		super.connectedCallback(), this._stopWatchingConfig = bt(() => {
			this.hasUpdated && this._load(), this.requestUpdate();
		});
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._stopWatchingConfig?.();
	}
	willUpdate(e) {
		this.hideTaxonomy || (this._checklist === null || e.has("checklistKey") || e.has("apiBase") || e.has("hideTaxonomy")) && this._load();
	}
	async _load() {
		let e = this._run = (this._run || 0) + 1, { apiBase: t, checklistKey: n } = F(this), r = await Jt({
			apiBase: t,
			checklistKey: n
		});
		e === this._run && (this._checklist = r || {});
	}
	render() {
		let { siteBase: e } = F(this), t = this._checklist, n = [t?.title, t?.version].filter(Boolean).join(" "), r = I(t?.url);
		return b`<p class="gbif-attribution">
      Biodiversity data from <a href=${e} target="_blank" rel="noopener">GBIF</a>, the Global Biodiversity
      Information Facility.
      ${n && !this.hideTaxonomy ? b`Taxonomy:
            ${r ? b`<a href=${r} target="_blank" rel="noopener">${n}</a>` : n}.` : S}
      <slot></slot>
    </p>`;
	}
}, xn = [
	"PRESERVED_SPECIMEN",
	"FOSSIL_SPECIMEN",
	"LIVING_SPECIMEN",
	"OBSERVATION",
	"HUMAN_OBSERVATION",
	"MACHINE_OBSERVATION",
	"MATERIAL_SAMPLE",
	"MATERIAL_CITATION",
	"LITERATURE",
	"OCCURRENCE",
	"UNKNOWN"
], Sn = {
	CC0_1_0: "CC0 1.0",
	CC_BY_4_0: "CC BY 4.0",
	CC_BY_NC_4_0: "CC BY-NC 4.0"
}, Cn = new Set("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK XZ YE YT ZA ZM ZW".split(" ")), wn = (() => {
	try {
		return new Intl.DisplayNames(["en"], { type: "region" });
	} catch {
		return null;
	}
})(), Tn = (e) => Cn.has(e);
function En(e) {
	if (e === "XZ") return "International waters";
	try {
		return wn?.of(e) || e;
	} catch {
		return e;
	}
}
var Dn = (e) => Array.isArray(e) ? e : typeof e == "string" ? e.split(/[,\s]+/) : e == null ? [] : [e], On = (e) => {
	let t = (t) => {
		let n = [...new Set(Dn(t).map((t) => e(String(t).trim())).filter(Boolean))];
		return n.length ? n : void 0;
	};
	return t.parseValue = e, t;
};
function kn(e) {
	let t = typeof e == "number" ? String(e) : e;
	if (typeof t != "string") return;
	let n = t.trim().replace(/^(\d{1,4}|\*)\s*[-–]\s*(\d{1,4}|\*)$/, "$1,$2").split(/\s*,\s*/);
	if (n.length > 2 || n.some((e) => !/^(\*|\d{1,4})$/.test(e))) return;
	if (n.length === 1) return n[0] === "*" ? void 0 : String(Number(n[0]));
	let [r, i] = n;
	if (r !== "*" || i !== "*") {
		if (r !== "*" && i !== "*") {
			let [e, t] = Number(r) <= Number(i) ? [r, i] : [i, r];
			return `${Number(e)},${Number(t)}`;
		}
		return `${r === "*" ? "*" : Number(r)},${i === "*" ? "*" : Number(i)}`;
	}
}
var W = {
	q: {
		type: "text",
		label: "Search",
		normalize: (e) => typeof e == "string" && e.trim() ? [...e.trim()].slice(0, 200).join("") : void 0
	},
	country: {
		type: "multi",
		label: "Country",
		facet: "COUNTRY",
		normalize: On((e) => /^[A-Za-z]{2}$/.test(e) && Tn(e.toUpperCase()) ? e.toUpperCase() : null)
	},
	basisOfRecord: {
		type: "multi",
		label: "Basis of record",
		facet: "BASIS_OF_RECORD",
		normalize: On((e) => xn.includes(e.toUpperCase()) ? e.toUpperCase() : null)
	},
	year: {
		type: "range",
		label: "Year",
		normalize: kn
	},
	license: {
		type: "multi",
		label: "Record licence",
		facet: "LICENSE",
		normalize: On((e) => Sn[e.toUpperCase()] ? e.toUpperCase() : null)
	},
	hasCoordinate: {
		type: "flag",
		label: "Only records with coordinates",
		normalize: (e) => e === !0 || e === "true" || void 0
	}
};
function G(e, t) {
	return Object.hasOwn(W, e) ? W[e].normalize(t) : void 0;
}
function An(e, t) {
	if (!Object.hasOwn(W, e) || t == null || t === !1) return;
	let n = typeof t == "string" ? t.trim() : t;
	if (n === "" || Array.isArray(n) && !n.length) return;
	let r = W[e];
	if (r.normalize.parseValue) {
		let e = Dn(n).map((e) => String(e).trim()).filter((e) => e && !r.normalize.parseValue(e));
		return e.length ? `${r.label}: "${e.join("\", \"")}" is not a value GBIF accepts` : void 0;
	}
	return r.normalize(n) === void 0 ? `${r.label}: "${n}" is not a value GBIF accepts` : void 0;
}
function jn(e = {}) {
	let t = {};
	for (let n of Object.keys(W)) {
		if (!(n in e)) continue;
		let r = G(n, e[n]);
		r !== void 0 && (t[n] = r);
	}
	return t;
}
function Mn(e, t = {}) {
	let n = { ...e };
	for (let [e, r] of Object.entries(t)) {
		if (!Object.hasOwn(W, e)) continue;
		let t = G(e, r);
		t === void 0 ? delete n[e] : n[e] = t;
	}
	return n;
}
function Nn(e, t) {
	let n = (e) => JSON.stringify(Object.keys(e).sort().map((t) => [t, e[t]]));
	return n(e) === n(t);
}
function Pn(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) t[n] = r === !0 ? "true" : r;
	return t;
}
function Fn(e, t = "") {
	let n = {};
	for (let [r, i] of Object.entries(W)) {
		let a = e.getAll(t + r);
		a.length && (n[r] = i.type === "multi" ? a : a[a.length - 1]);
	}
	return jn(n);
}
function In(e, t, n = "") {
	let r = new Set(Object.keys(W).map((e) => n + e)), i = (e) => {
		let t = e.split("=", 1)[0].replace(/\+/g, " ");
		try {
			return decodeURIComponent(t);
		} catch {
			return t;
		}
	}, a = e.search.replace(/^\?/, "").split("&").filter((e) => e && !r.has(i(e))), o = new URLSearchParams();
	for (let [e, r] of Object.entries(Pn(t))) for (let t of Array.isArray(r) ? r : [r]) o.append(n + e, t);
	let s = o.toString();
	return e.search = (s ? [...a, s] : a).join("&"), e;
}
// src/shared/predicate.js
var Ln = [
	"and",
	"equals",
	"fullTextSearch",
	"geoDistance",
	"greaterThan",
	"greaterThanOrEquals",
	"in",
	"isNotNull",
	"isNull",
	"lessThan",
	"lessThanOrEquals",
	"like",
	"not",
	"or",
	"range",
	"within"
], Rn = 10, zn = 1e3, Bn = 1e5, Vn = [
	"equals",
	"like",
	"greaterThan",
	"greaterThanOrEquals",
	"lessThan",
	"lessThanOrEquals"
], Hn = (e) => typeof e == "string" || typeof e == "number" || typeof e == "boolean", Un = (e) => typeof e == "object" && !!e && !Array.isArray(e);
function Wn(e, t = 0, n = { nodes: 0 }) {
	if (++n.nodes > zn) return `it has more than ${zn} parts`;
	if (t > Rn) return `it is nested more than ${Rn} levels deep`;
	if (!Un(e)) return "a part of it is not an object";
	let { type: r } = e;
	if (!Ln.includes(r)) return `"${String(r)}" is not a predicate type (known: ${Ln.join(", ")})`;
	if (r === "and" || r === "or") {
		if (!Array.isArray(e.predicates) || !e.predicates.length) return `"${r}" needs a non-empty "predicates" list`;
		for (let r of e.predicates) {
			let e = Wn(r, t + 1, n);
			if (e) return e;
		}
		return null;
	}
	return r === "not" ? Wn(e.predicate, t + 1, n) ?? null : Vn.includes(r) ? typeof e.key != "string" || !e.key ? `"${r}" needs a "key"` : Hn(e.value) ? null : `"${r}" on ${e.key} needs a "value"` : r === "in" ? typeof e.key != "string" || !e.key ? "\"in\" needs a \"key\"" : !Array.isArray(e.values) || !e.values.length || !e.values.every(Hn) ? `"in" on ${e.key} needs a non-empty "values" list` : null : r === "isNull" || r === "isNotNull" ? typeof e.parameter == "string" && e.parameter ? null : `"${r}" needs a "parameter"` : r === "within" ? typeof e.geometry == "string" && e.geometry ? null : "\"within\" needs a \"geometry\"" : r === "range" ? typeof e.key == "string" && e.key ? null : "\"range\" needs a \"key\"" : null;
}
function Gn(e) {
	if (typeof e != "string" || !e.trim()) return { error: "it is empty" };
	if (e.length > Bn) return { error: `it is longer than ${Bn.toLocaleString()} characters` };
	let t;
	try {
		t = JSON.parse(e);
	} catch (e) {
		return { error: `it is not valid JSON (${e.message})` };
	}
	let n = Wn(t);
	return n ? { error: n } : { predicate: t };
}
function Kn(e) {
	let [t, n] = e.split(",");
	if (n === void 0) return {
		type: "equals",
		key: "YEAR",
		value: t
	};
	let r = [];
	return t !== "*" && r.push({
		type: "greaterThanOrEquals",
		key: "YEAR",
		value: t
	}), n !== "*" && r.push({
		type: "lessThanOrEquals",
		key: "YEAR",
		value: n
	}), r.length === 1 ? r[0] : {
		type: "and",
		predicates: r
	};
}
var qn = (e, t) => t.length === 1 ? {
	type: "equals",
	key: e,
	value: t[0]
} : {
	type: "in",
	key: e,
	values: t
}, Jn = {
	country: (e) => qn("COUNTRY", e),
	basisOfRecord: (e) => qn("BASIS_OF_RECORD", e),
	license: (e) => qn("LICENSE", e),
	year: Kn,
	hasCoordinate: () => ({
		type: "equals",
		key: "HAS_COORDINATE",
		value: "true"
	})
};
function Yn({ base: e = null, taxonKey: t, datasetKey: n, checklistKey: r, query: i = {}, without: a = [], mediaType: o } = {}) {
	let s = [];
	e && s.push(e), t && s.push({
		type: "equals",
		key: "TAXON_KEY",
		value: t,
		checklistKey: r
	}), n && s.push({
		type: "equals",
		key: "DATASET_KEY",
		value: n
	});
	for (let [e, t] of Object.entries(i)) !a.includes(e) && Jn[e] && s.push(Jn[e](t));
	return o && s.push({
		type: "equals",
		key: "MEDIA_TYPE",
		value: o
	}), s.length ? s.length === 1 ? s[0] : {
		type: "and",
		predicates: s
	} : null;
}
// src/shared/md5.js
var Xn = [
	[
		7,
		12,
		17,
		22
	],
	[
		5,
		9,
		14,
		20
	],
	[
		4,
		11,
		16,
		23
	],
	[
		6,
		10,
		15,
		21
	]
].flatMap((e) => Array.from({ length: 16 }, (t, n) => e[n % 4])), Zn = Array.from({ length: 64 }, (e, t) => Math.floor(Math.abs(Math.sin(t + 1)) * 2 ** 32) >>> 0), Qn = (e, t) => (e << t | e >>> 32 - t) >>> 0;
function $n(e) {
	let t = new TextEncoder().encode(String(e)), n = t.length, r = (n + 8 >> 6) + 1, i = new Uint32Array(r * 16);
	for (let e = 0; e < n; e += 1) i[e >> 2] |= t[e] << e % 4 * 8;
	i[n >> 2] |= 128 << n % 4 * 8, i[r * 16 - 2] = n * 8 >>> 0, i[r * 16 - 1] = Math.floor(n * 8 / 2 ** 32);
	let a = 1732584193, o = 4023233417, s = 2562383102, c = 271733878;
	for (let e = 0; e < r; e += 1) {
		let t = a, n = o, r = s, l = c;
		for (let a = 0; a < 64; a += 1) {
			let o, s;
			a < 16 ? (o = n & r | ~n & l, s = a) : a < 32 ? (o = l & n | ~l & r, s = (5 * a + 1) % 16) : a < 48 ? (o = n ^ r ^ l, s = (3 * a + 5) % 16) : (o = r ^ (n | ~l), s = 7 * a % 16);
			let c = o + t + Zn[a] + i[e * 16 + s] >>> 0;
			t = l, l = r, r = n, n = n + Qn(c, Xn[a]) >>> 0;
		}
		a = a + t >>> 0, o = o + n >>> 0, s = s + r >>> 0, c = c + l >>> 0;
	}
	return [
		a,
		o,
		s,
		c
	].map((e) => Array.from({ length: 4 }, (t, n) => (e >>> n * 8 & 255).toString(16).padStart(2, "0")).join("")).join("");
}
// src/shared/occurrence.js
var K = 1e5;
async function er({ apiBase: e, params: t, limit: n, offset: r }) {
	let i = Math.max(0, Math.min(n, K - r)), a = await M(j(e, "/v1/occurrence/search", {
		...t,
		limit: i,
		offset: r
	}));
	return {
		count: typeof a?.count == "number" ? a.count : 0,
		results: (Array.isArray(a?.results) ? a.results : []).filter((e) => e && typeof e == "object")
	};
}
async function tr({ apiBase: e, params: t, facets: n, facetLimit: r = 15 }) {
	let i = await M(j(e, "/v1/occurrence/search", {
		...t,
		limit: 0,
		facet: n,
		facetLimit: r,
		facetMincount: 1,
		facetMultiselect: !0
	})), a = {};
	for (let e of Array.isArray(i?.facets) ? i.facets : []) e && typeof e.field == "string" && (a[e.field] = (Array.isArray(e?.counts) ? e.counts : []).filter((e) => e && typeof e.name == "string" && typeof e.count == "number").map((e) => ({
		name: e.name,
		count: e.count
	})));
	return {
		count: typeof i?.count == "number" ? i.count : 0,
		facets: a
	};
}
var nr = "/v1/occurrence/search/predicate";
function rr(e) {
	return {
		count: typeof e?.count == "number" ? e.count : 0,
		results: (Array.isArray(e?.results) ? e.results : []).filter((e) => e && typeof e == "object")
	};
}
async function ir({ apiBase: e, predicate: t, q: n, limit: r, offset: i }) {
	if (!t) throw Error("A predicate search needs a predicate.");
	let a = {
		limit: Math.max(0, Math.min(r, K - i)),
		offset: i,
		predicate: t,
		...n ? { q: n } : {}
	};
	return rr(await _t(j(e, nr), a));
}
async function ar({ apiBase: e, build: t, filters: n, active: r, facetLimit: i = 15 }) {
	let a = j(e, nr), o = n.filter((e) => W[e]?.facet), s = o.filter((e) => r.has(e)), c = o.filter((e) => !r.has(e)), l = (e, n) => {
		let { predicate: r, q: o } = t(e);
		if (!r) throw Error("A predicate search needs a predicate.");
		return _t(a, {
			limit: 0,
			predicate: r,
			...o ? { q: o } : {},
			...n.length ? {
				facets: n.map((e) => W[e].facet),
				facetLimit: i,
				facetMincount: 1,
				facetMultiselect: !1
			} : {}
		});
	}, u = await Promise.all([l([], c), ...s.map((e) => l([e], [e]))]), d = {};
	for (let e of u) for (let t of Array.isArray(e?.facets) ? e.facets : []) t && typeof t.field == "string" && (d[t.field] = (Array.isArray(t.counts) ? t.counts : []).filter((e) => e && typeof e.name == "string" && typeof e.count == "number").map((e) => ({
		name: e.name,
		count: e.count
	})));
	return {
		count: typeof u[0]?.count == "number" ? u[0].count : 0,
		facets: d
	};
}
function or(e) {
	if (typeof e != "string" || !e) return "";
	let t = e.toLowerCase().replace(/_/g, " ");
	return t.charAt(0).toUpperCase() + t.slice(1);
}
function sr(e) {
	return typeof e != "string" || !e ? "" : Sn[e] ? Sn[e] : L(e)?.label ?? "";
}
function cr(e) {
	if (typeof e != "string") return "";
	let t = e.trim();
	return /^\d{4}-\d{2}-\d{2}T/.test(t) ? t.slice(0, 10) : t;
}
var lr = {
	scientificName: {
		label: "Scientific name",
		value: (e) => e.scientificName
	},
	country: {
		label: "Country",
		value: (e) => e.country
	},
	eventDate: {
		label: "Date",
		value: (e) => cr(e.eventDate)
	},
	year: {
		label: "Year",
		value: (e) => typeof e.year == "number" ? String(e.year) : ""
	},
	basisOfRecord: {
		label: "Basis of record",
		value: (e) => or(e.basisOfRecord)
	},
	recordedBy: {
		label: "Recorded by",
		value: (e) => typeof e.recordedBy == "string" ? e.recordedBy : ""
	},
	dataset: {
		label: "Dataset",
		value: (e) => e.datasetName
	},
	institution: {
		label: "Institution",
		value: (e) => [e.institutionCode, e.catalogNumber].filter((e) => typeof e == "string" && e).join(" ")
	},
	license: {
		label: "Licence",
		value: (e) => sr(e.license)
	}
}, ur = [
	"scientificName",
	"country",
	"eventDate",
	"basisOfRecord",
	"dataset"
];
function dr(e) {
	let t = typeof e == "string" ? e.split(/[\s,]+/).filter((e) => Object.hasOwn(lr, e)) : [];
	return t.length ? [...new Set(t)] : ur;
}
function fr(e, t) {
	let n = lr[e].value(t);
	return typeof n == "string" ? n.trim() : "";
}
function pr(e) {
	let t = (Array.isArray(e?.media) ? e.media : []).find((e) => e && typeof e == "object" && e.type === "StillImage" && I(e.identifier));
	if (!t) return null;
	let n = L(t.license), r = (e) => typeof e == "string" && e.trim() ? e.trim() : void 0;
	return {
		identifier: t.identifier,
		url: I(t.identifier),
		occurrenceKey: String(e.key),
		rightsHolder: r(t.rightsHolder) ?? r(t.creator),
		license: n,
		licenseKey: n?.key ?? "unknown",
		name: r(e.scientificName),
		country: r(e.country)
	};
}
function mr({ apiBase: e, occurrenceKey: t, identifier: n, width: r = 400 }) {
	return j(e, `/v1/image/cache/fit-in/${r}x/occurrence/${encodeURIComponent(t)}/media/${$n(n)}`);
}
// src/components/gbif-occurrence-search.js
var hr = [
	"country",
	"year",
	"basisOfRecord",
	"license",
	"hasCoordinate",
	"q"
], gr = [
	"taxonKey",
	"datasetKey",
	"checklistKey",
	"apiBase",
	"siteBase",
	"predicate"
], _r = /* @__PURE__ */ new Set(), q = (e) => typeof e == "string" && /^[\w.-]{1,64}$/.test(e.trim()) ? e.trim() : void 0, vr = class extends E {
	static properties = {
		taxonKey: {
			type: String,
			attribute: "taxon-key"
		},
		datasetKey: {
			type: String,
			attribute: "dataset-key"
		},
		checklistKey: {
			type: String,
			attribute: "checklist-key"
		},
		apiBase: {
			type: String,
			attribute: "api-base"
		},
		siteBase: {
			type: String,
			attribute: "site-base"
		},
		country: { type: String },
		year: { type: String },
		basisOfRecord: {
			type: String,
			attribute: "basis-of-record"
		},
		license: { type: String },
		hasCoordinate: {
			attribute: "has-coordinate",
			converter: { fromAttribute: (e) => e !== null && e !== "false" }
		},
		q: { type: String },
		predicate: { type: String },
		syncUrl: {
			type: Boolean,
			attribute: "sync-url"
		},
		urlPrefix: {
			type: String,
			attribute: "url-prefix"
		},
		urlHistory: {
			type: String,
			attribute: "url-history"
		}
	};
	static styles = s`
    :host {
      display: contents;
    }
  `;
	constructor() {
		super(), this.urlPrefix = "gbif_", this.urlHistory = "push", this._userQuery = {}, this._syncing = !1, this._ready = !1, this._onPopState = () => this._readUrl("url");
	}
	get _parsed() {
		return this._parsedFor !== this.predicate && (this._parsedFor = this.predicate, this._parsedResult = this.predicate ? Gn(this.predicate) : null), this._parsedResult;
	}
	willUpdate(e) {
		if ([...gr, ...hr].some((t) => e.has(t)) && this.problem !== this._reportedProblem && (this._reportedProblem = this.problem, this.problem)) {
			let e = `${this.problem}.`;
			console.warn(`[gbif-components] <${this.localName}> ${e}`), z(this, "gbif-error", {
				component: this.localName,
				url: void 0,
				status: 0,
				message: e
			});
		}
	}
	get valid() {
		return !this.problem;
	}
	get problem() {
		if (this._parsed?.error) return `The predicate is not valid: ${this._parsed.error}`;
		for (let [e, t] of [["taxonKey", "taxon-key"], ["datasetKey", "dataset-key"]]) {
			let n = this[e];
			if (typeof n == "string" && n.trim() && !q(n)) return `The ${t} "${n.trim().slice(0, 60)}" is not a key (one key, letters, digits, dots, dashes)`;
		}
		for (let e of hr) {
			let t = An(e, this[e]);
			if (t) return `The search is not valid: ${t}`;
		}
	}
	get predicateError() {
		return this._parsed?.error;
	}
	get fixedFilters() {
		return jn({
			country: this.country,
			year: this.year,
			basisOfRecord: this.basisOfRecord,
			license: this.license,
			hasCoordinate: this.hasCoordinate,
			q: this.q
		});
	}
	get fixed() {
		return Object.keys(this.fixedFilters);
	}
	get userQuery() {
		return this._userQuery;
	}
	get query() {
		return {
			...this._userQuery,
			...this.fixedFilters
		};
	}
	get params() {
		let e = Pn(this.query), t = q(this.taxonKey), n = q(this.datasetKey);
		return t && (e.taxonKey = t, e.checklistKey = this.config.checklistKey), n && (e.datasetKey = n), e;
	}
	_build(e = [], t) {
		let { q: n, ...r } = Object.fromEntries(Object.entries(this.query).filter(([t]) => !e.includes(t)));
		return {
			predicate: Yn({
				base: this._parsed?.predicate ?? null,
				taxonKey: q(this.taxonKey),
				datasetKey: q(this.datasetKey),
				checklistKey: this.config.checklistKey,
				query: r,
				mediaType: t
			}),
			q: n
		};
	}
	_assertValid() {
		if (!this.valid) throw new A(`${this.problem}.`);
	}
	async fetchPage({ limit: e, offset: t, mediaType: n }) {
		this._assertValid();
		let { apiBase: r } = this.config;
		return this.predicate ? ir({
			apiBase: r,
			...this._build([], n),
			limit: e,
			offset: t
		}) : er({
			apiBase: r,
			params: {
				...this.params,
				...n ? { mediaType: n } : {}
			},
			limit: e,
			offset: t
		});
	}
	async fetchFacets({ filters: e, facetLimit: t }) {
		this._assertValid();
		let { apiBase: n } = this.config;
		return this.predicate ? ar({
			apiBase: n,
			build: (e) => this._build(e),
			filters: e,
			active: new Set(Object.keys(this._userQuery)),
			facetLimit: t
		}) : tr({
			apiBase: n,
			params: this.params,
			facets: e.map((e) => W[e].facet).filter(Boolean),
			facetLimit: t
		});
	}
	get config() {
		return F(this);
	}
	setFilters(e = {}, t = "update") {
		let n = Object.fromEntries(Object.entries(e).filter(([e]) => !this.fixed.includes(e))), r = Mn(this._userQuery, n);
		return !Nn(r, this._userQuery) && (this._userQuery = r, this._changed(t), !0);
	}
	reset() {
		return Object.keys(this._userQuery).length ? (this._userQuery = {}, this._changed("reset"), !0) : !1;
	}
	_changed(e) {
		this.syncUrl && (e === "update" || e === "reset") && this._writeUrl(), z(this, "gbif-query-change", {
			query: this.query,
			userQuery: this._userQuery,
			params: this.params,
			predicate: this._build().predicate,
			source: e
		});
	}
	connectedCallback() {
		super.connectedCallback(), this.syncUrl && this._startSync(), this._stopWatchingConfig = bt(() => this._ready && this._changed("attributes"));
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._stopSync(), this._stopWatchingConfig?.();
	}
	updated(e) {
		e.has("syncUrl") && this._ready && (this.syncUrl ? this._startSync() : this._stopSync()), this._ready && [...hr, ...gr].some((t) => e.has(t)) && this._changed("attributes"), this._ready = !0;
	}
	_startSync() {
		if (this._syncing) return;
		this._syncing = !0;
		let e = this.urlPrefix ?? "";
		[..._r].some((t) => (t.urlPrefix ?? "") === e) && console.warn(`[gbif-components] Two <${this.localName}> elements keep their filters in the address with the same url-prefix ("${e}"). They will overwrite each other's parameters: give each its own url-prefix.`), _r.add(this), globalThis.addEventListener("popstate", this._onPopState), this._readUrl(this._ready ? "url" : null);
	}
	_stopSync() {
		this._syncing && (this._syncing = !1, _r.delete(this), globalThis.removeEventListener("popstate", this._onPopState));
	}
	_readUrl(e) {
		let t = Fn(new URL(globalThis.location.href).searchParams, this.urlPrefix ?? ""), n = Object.fromEntries(Object.entries(t).filter(([e]) => !this.fixed.includes(e)));
		Nn(n, this._userQuery) || (this._userQuery = n, e && this._changed(e));
	}
	_writeUrl() {
		let e = In(new URL(globalThis.location.href), this._userQuery, this.urlPrefix ?? "");
		e.href !== globalThis.location.href && globalThis.history[this.urlHistory === "replace" ? "replaceState" : "pushState"](globalThis.history.state, "", e);
	}
	render() {
		return b`<slot></slot>`;
	}
}, yr = Ve(class extends He {
	constructor(e) {
		if (super(e), e.type !== D.PROPERTY && e.type !== D.ATTRIBUTE && e.type !== D.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Ke(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === x || t === S) return t;
		let n = e.element, r = e.name;
		if (e.type === D.PROPERTY) {
			if (t === n[r]) return x;
		} else if (e.type === D.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return x;
		} else if (e.type === D.ATTRIBUTE && n.getAttribute(r) === t + "") return x;
		return Je(e), t;
	}
}), br = /* @__PURE__ */ new Set(), xr = null, Sr = !1;
function Cr() {
	Sr = !1;
	for (let e of [...br]) e._recheck();
}
function wr() {
	Sr || (Sr = !0, queueMicrotask(Cr));
}
function Tr(e) {
	br.add(e), xr ??= new MutationObserver(wr), xr.observe(document, {
		childList: !0,
		subtree: !0
	});
	let t = e.getRootNode();
	t !== document && t instanceof ShadowRoot && xr.observe(t, {
		childList: !0,
		subtree: !0
	});
}
function Er(e) {
	br.delete(e), br.size || (xr?.disconnect(), xr = null);
}
var Dr = class extends It {
	static properties = { _linkStatus: { state: !0 } };
	constructor() {
		super(), this.linked = null, this._linkStatus = "looking", this._bindRun = 0, this._onLinkedChange = (e) => {
			e.target === this.linked && this.onLinkedChange(e.detail);
		};
	}
	get _selector() {
		return this[this.constructor.linkProperty];
	}
	connectedCallback() {
		super.connectedCallback(), this._bind();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._bindRun += 1, Er(this), this._unbind();
	}
	_recheck() {
		if (this.isConnected) {
			if (this._linkStatus === "bound") this.linked?.isConnected || this._bind();
			else if (this._linkStatus === "missing") {
				let e = this._find();
				e && e.localName === this.constructor.linkTag && this._bind();
			}
		}
	}
	updated(e) {
		e.has(this.constructor.linkProperty) && this._selector !== this._boundSelector && this._bind();
	}
	_find() {
		try {
			return this._selector ? this.getRootNode().querySelector?.(this._selector) ?? document.querySelector(this._selector) : this.closest(this.constructor.linkTag);
		} catch {
			return null;
		}
	}
	_unbind() {
		this.linked?.removeEventListener(this.constructor.linkEvent, this._onLinkedChange), this.linked = null;
	}
	async _bind() {
		let { linkTag: e, linkEvent: t, linkReady: n } = this.constructor, r = ++this._bindRun;
		if (this._boundSelector = this._selector, this._unbind(), this._linkStatus = "looking", Tr(this), await null, r !== this._bindRun || !this.isConnected) return;
		let i = this._find();
		if (!i && document.readyState === "loading") {
			if (await new Promise((e) => document.addEventListener("DOMContentLoaded", e, { once: !0 })), r !== this._bindRun) return;
			i = this._find();
		}
		if (i && typeof i[n] != "function" && (customElements.get(e) ? customElements.upgrade(i) : await customElements.whenDefined(e)), r === this._bindRun && this.isConnected) {
			if (!i || i.localName !== e || typeof i[n] != "function") {
				this._linkStatus = "missing";
				let t = i ? `matched <${i.localName}>, which is not a <${e}>` : `found no <${e}>${this._selector ? ` for "${this._selector}"` : " around it"}`;
				console.warn(`[gbif-components] <${this.localName}> ${t}.`);
			} else this.linked = i, i.addEventListener(t, this._onLinkedChange), this._linkStatus = "bound", this.onLinked();
		}
	}
	onLinked() {}
	onLinkedChange() {}
}, J = class extends Dr {
	static linkTag = "gbif-occurrence-search";
	static linkProperty = "search";
	static linkEvent = "gbif-query-change";
	static linkReady = "fetchPage";
	static properties = { search: { type: String } };
	get searchEl() {
		return this.linked;
	}
	get _searchStatus() {
		return this._linkStatus;
	}
	get config() {
		let e = F({ hideSource: this.hideSource });
		return {
			...this.searchEl?.config ?? e,
			showSource: e.showSource
		};
	}
	onLinked() {
		this.onSearchBound();
	}
	onLinkedChange(e) {
		this.onQueryChange(e);
	}
	renderSearchProblem() {
		return this._searchStatus === "missing" ? b`<p class="gbif-card__state" role="alert">No occurrence search was found for this component.</p>` : this._searchStatus === "bound" ? this.searchEl.valid ? null : b`<p class="gbif-card__state" role="alert">
        This search cannot be shown. ${this.searchEl.problem}.
      </p>` : S;
	}
	onSearchBound() {}
	onQueryChange() {}
}, Or = [
	"q",
	"country",
	"basisOfRecord",
	"year",
	"license",
	"hasCoordinate"
], kr = (e) => e.replace(/-([a-z])/g, (e, t) => t.toUpperCase()), Ar = {
	country: En,
	basisOfRecord: or,
	license: (e) => Sn[e] ?? e
};
function jr(e) {
	if (typeof e != "string") return {
		from: "",
		to: ""
	};
	let [t, n] = e.split(",");
	return n === void 0 ? {
		from: t,
		to: t
	} : {
		from: t === "*" ? "" : t,
		to: n === "*" ? "" : n
	};
}
var Mr = class extends J {
	static properties = {
		filters: { type: String },
		facetLimit: {
			type: Number,
			attribute: "facet-limit"
		},
		_query: { state: !0 },
		_facets: { state: !0 },
		_total: { state: !0 },
		_facetStatus: { state: !0 },
		_yearInvalid: { state: !0 }
	};
	static styles = [...J.styles, s`
      .gbif-occurrence-filters__form {
        display: grid;
        gap: 1rem;
      }
      .gbif-occurrence-filters__group {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      .gbif-occurrence-filters__legend {
        padding: 0;
        margin-bottom: 0.25rem;
        font-weight: 600;
      }
      .gbif-occurrence-filters__list {
        max-height: 14rem;
        margin: 0;
        padding: 0;
        overflow: auto;
        list-style: none;
      }
      .gbif-occurrence-filters__option {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        padding: 0.1rem 0;
        cursor: pointer;
      }
      .gbif-occurrence-filters__option-label {
        flex: 1;
        min-width: 0;
      }
      .gbif-occurrence-filters__count {
        flex: none;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-occurrence-filters__input {
        width: 100%;
        padding: 0.35rem 0.5rem;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 4px;
        background: var(--gbif-color-surface, #fff);
        color: var(--gbif-color-text, #1f2933);
        font: inherit;
      }
      .gbif-occurrence-filters__years {
        display: flex;
        gap: 0.5rem;
      }
      .gbif-occurrence-filters__years label {
        flex: 1;
        font-size: 0.75rem;
      }
      .gbif-occurrence-filters__total {
        margin: 0 0 0.75rem;
        font-weight: 600;
      }
    `];
	constructor() {
		super(), this.facetLimit = 15, this._query = {}, this._facets = {}, this._total = null, this._facetStatus = "idle", this._yearInvalid = !1, this._run = 0, this._typing = 0;
	}
	get _offered() {
		let e = typeof this.filters == "string" && this.filters.trim() ? this.filters.split(/[\s,]+/).map(kr).filter((e) => Or.includes(e)) : Or, t = this.searchEl?.fixed ?? [];
		return [...new Set(e)].filter((e) => !t.includes(e));
	}
	onSearchBound() {
		this._query = this.searchEl.userQuery, this._load();
	}
	updated(e) {
		super.updated(e);
		let t = !this._updatedOnce;
		this._updatedOnce = !0, !t && this.searchEl && (e.has("filters") || e.has("facetLimit")) && this._load();
	}
	onQueryChange() {
		this._query = this.searchEl.userQuery, this._load();
	}
	async _load() {
		let e = ++this._run;
		if (!this.searchEl.valid) this._facetStatus = "idle", this._total = null;
		else {
			this._facetStatus = "loading";
			try {
				let { count: t, facets: n } = await this.searchEl.fetchFacets({
					filters: this._offered.filter((e) => W[e].facet),
					facetLimit: R(this.facetLimit, {
						min: 1,
						max: 100,
						fallback: 15
					})
				});
				if (e !== this._run) return;
				this._total = t, this._facets = n, this._facetStatus = "ready";
			} catch (t) {
				if (e !== this._run) return;
				this._facetStatus = "error", z(this, "gbif-error", {
					component: this.localName,
					url: t.url,
					status: t.status ?? 0,
					message: t.message
				});
			}
		}
	}
	disconnectedCallback() {
		super.disconnectedCallback(), clearTimeout(this._typing);
	}
	_toggle(e, t, n) {
		let r = this._query[e] ?? [];
		this.searchEl.setFilters({ [e]: n ? [...r, t] : r.filter((e) => e !== t) });
	}
	_textValue() {
		let e = this._query.q ?? "", t = this.renderRoot?.querySelector("#gbif-filter-q");
		return t && G("q", t.value) === (e || void 0) ? t.value : e;
	}
	_onText(e, t) {
		let n = e.target.value;
		clearTimeout(this._typing), t ? this.searchEl.setFilters({ q: n }) : this._typing = setTimeout(() => this.searchEl.setFilters({ q: n }), 400);
	}
	_onYear() {
		let e = this.renderRoot.querySelector("[name=year-from]").value.trim(), t = this.renderRoot.querySelector("[name=year-to]").value.trim(), n = e || t ? `${e || "*"},${t || "*"}` : null;
		this._yearInvalid = n !== null && G("year", n) === void 0, this._yearInvalid || this.searchEl.setFilters({ year: n });
	}
	_reset() {
		Object.keys(this._query).length && this.searchEl.reset();
	}
	_renderMulti(e) {
		let t = this._query[e] ?? [], n = W[e].facet, r = this._facets[n] ?? [], i = [...r.filter(({ name: t }) => G(e, t) !== void 0).map(({ name: e, count: t }) => ({
			name: e,
			count: t
		})), ...t.filter((e) => !r.some((t) => t.name === e)).map((e) => ({
			name: e,
			count: 0
		}))], a = Ar[e];
		return b`<fieldset class="gbif-occurrence-filters__group">
      <legend class="gbif-occurrence-filters__legend">${W[e].label}</legend>
      ${i.length ? b`<ul class="gbif-occurrence-filters__list">
            ${i.map(({ name: n, count: r }) => b`<li>
                <label class="gbif-occurrence-filters__option">
                  <input
                    type="checkbox"
                    .checked=${yr(t.includes(n))}
                    @change=${(t) => this._toggle(e, n, t.target.checked)}
                  />
                  <span class="gbif-occurrence-filters__option-label">${a(n)}</span>
                  <span class="gbif-occurrence-filters__count">${r.toLocaleString()}</span>
                </label>
              </li>`)}
          </ul>` : b`<p class="gbif-card__state">${this._facetStatus === "loading" ? "Loading…" : "No values."}</p>`}
    </fieldset>`;
	}
	_renderControl(e) {
		switch (e) {
			case "q": return b`<div class="gbif-occurrence-filters__group">
          <label class="gbif-occurrence-filters__legend" for="gbif-filter-q">${W.q.label}</label>
          <input
            id="gbif-filter-q"
            class="gbif-occurrence-filters__input"
            type="search"
            .value=${this._textValue()}
            @input=${(e) => this._onText(e, !1)}
            @keydown=${(e) => e.key === "Enter" && this._onText(e, !0)}
          />
        </div>`;
			case "year": {
				let { from: e, to: t } = jr(this._query.year);
				return b`<fieldset class="gbif-occurrence-filters__group">
          <legend class="gbif-occurrence-filters__legend">${W.year.label}</legend>
          <div class="gbif-occurrence-filters__years">
            <label>From
              <input class="gbif-occurrence-filters__input" name="year-from" type="number" min="0" max="9999" step="1" aria-invalid=${this._yearInvalid ? "true" : "false"} .value=${e} @change=${this._onYear} />
            </label>
            <label>To
              <input class="gbif-occurrence-filters__input" name="year-to" type="number" min="0" max="9999" step="1" aria-invalid=${this._yearInvalid ? "true" : "false"} .value=${t} @change=${this._onYear} />
            </label>
          </div>
          ${this._yearInvalid ? b`<p class="gbif-card__state" role="alert">Enter a year from 0 to 9999.</p>` : S}
        </fieldset>`;
			}
			case "hasCoordinate": return b`<label class="gbif-occurrence-filters__option">
          <input
            type="checkbox"
            .checked=${yr(this._query.hasCoordinate === !0)}
            @change=${(e) => this.searchEl.setFilters({ hasCoordinate: e.target.checked })}
          />
          <span class="gbif-occurrence-filters__option-label">${W.hasCoordinate.label}</span>
        </label>`;
			default: return this._renderMulti(e);
		}
	}
	render() {
		let e = this.renderSearchProblem();
		if (e) return e;
		let t = Object.keys(this._query).length > 0;
		return b`
      <section class="gbif-card" part="card" aria-busy=${this._facetStatus === "loading" ? "true" : "false"}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || "Filters")}
        </header>
        <div class="gbif-card__body" part="body">
          ${this._total === null ? S : b`<p class="gbif-occurrence-filters__total">
                ${this._total.toLocaleString()} occurrence${this._total === 1 ? "" : "s"}
              </p>`}
          ${this._facetStatus === "error" ? b`<p class="gbif-card__state" role="alert">Could not load the filter options from GBIF.</p>` : S}
          <form class="gbif-occurrence-filters__form" @submit=${(e) => e.preventDefault()}>
            ${this._offered.map((e) => this._renderControl(e))}
            <div>
              <button type="button" class="gbif-button" aria-disabled=${t ? "false" : "true"} @click=${this._reset}>
                Clear filters
              </button>
            </div>
          </form>
        </div>
        ${this.config.showSource ? b`<footer class="gbif-card__footer" part="footer">${this.renderSource("Occurrence data from GBIF.")}</footer>` : S}
      </section>
    `;
	}
}, Nr = class extends J {
	static properties = {
		columns: { type: String },
		pageSize: {
			type: Number,
			attribute: "page-size"
		},
		_rows: { state: !0 },
		_total: { state: !0 },
		_page: { state: !0 },
		_status: { state: !0 },
		_pageError: { state: !0 },
		_loading: { state: !0 }
	};
	static styles = [...J.styles, s`
      .gbif-occurrence-table__scroll {
        overflow-x: auto;
      }
      .gbif-occurrence-table__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
      }
      .gbif-occurrence-table__table th,
      .gbif-occurrence-table__table td {
        padding: 0.4rem 0.6rem;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
        text-align: left;
        vertical-align: top;
        unicode-bidi: plaintext;
      }
      .gbif-occurrence-table__table th {
        color: var(--gbif-color-muted, #596273);
        font-size: 0.7rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .gbif-occurrence-table__name {
        font-style: italic;
      }
      .gbif-occurrence-table__nowrap {
        white-space: nowrap;
      }
      .gbif-occurrence-table__summary {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.5rem var(--gbif-card-padding, 1rem);
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-occurrence-table__pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem var(--gbif-card-padding, 1rem);
        font-size: 0.75rem;
      }
      .gbif-occurrence-table__error {
        margin: 0;
        padding: 0 var(--gbif-card-padding, 1rem) 0.6rem;
        color: var(--gbif-color-error, #a32020);
        font-size: 0.8rem;
      }
    `];
	constructor() {
		super(), this.pageSize = 20, this._rows = [], this._total = 0, this._page = 0, this._status = "idle", this._pageError = !1, this._loading = !1, this._run = 0;
	}
	get _size() {
		return R(this.pageSize, {
			min: 1,
			max: 100,
			fallback: 20
		});
	}
	get _pageCount() {
		return Math.max(1, Math.ceil(Math.min(this._total, K) / this._size));
	}
	get _columns() {
		return dr(this.columns);
	}
	updated(e) {
		super.updated(e);
		let t = !this._updatedOnce;
		this._updatedOnce = !0, !t && e.has("pageSize") && this.searchEl && this._load(0);
	}
	onSearchBound() {
		this._load(0);
	}
	onQueryChange() {
		this._load(0);
	}
	async _load(e, { paging: t = !1 } = {}) {
		let n = ++this._run;
		if (!this.searchEl.valid) this._rows = [], this._status = "invalid", this._loading = !1;
		else {
			this._status = this._status === "ready" ? "ready" : "loading", this._pageError = !1, this._loading = !0;
			try {
				let { count: t, results: r } = await this.searchEl.fetchPage({
					limit: this._size,
					offset: e * this._size
				});
				if (n !== this._run) return;
				this._rows = r, this._total = t, this._page = e, this._status = "ready";
			} catch (e) {
				if (n !== this._run) return;
				t && this._status === "ready" ? this._pageError = !0 : (this._status = "error", this._rows = []), z(this, "gbif-error", {
					component: this.localName,
					url: e.url,
					status: e.status ?? 0,
					message: e.message
				});
			} finally {
				n === this._run && (this._loading = !1);
			}
		}
	}
	_goTo(e) {
		e < 0 || e >= this._pageCount || this._loading || this._load(e, { paging: !0 });
	}
	_renderPager() {
		return b`<div class="gbif-occurrence-table__pager">
      <button type="button" class="gbif-button" aria-disabled=${this._page === 0 || this._loading ? "true" : "false"} @click=${() => this._goTo(this._page - 1)}>‹ Prev</button>
      <span>Page ${(this._page + 1).toLocaleString()} of ${this._pageCount.toLocaleString()}</span>
      <button type="button" class="gbif-button" aria-disabled=${this._page >= this._pageCount - 1 || this._loading ? "true" : "false"} @click=${() => this._goTo(this._page + 1)}>Next ›</button>
    </div>`;
	}
	_renderCell(e, t) {
		let n = fr(e, t);
		return e === "scientificName" ? b`<td class="gbif-occurrence-table__name">
      <a
        href=${H(this.config.siteBase, t.key)}
        target="_blank"
        rel="noopener"
        @click=${(e) => B(this, e, "gbif-occurrence-select", {
			occurrenceKey: String(t.key),
			source: "table"
		})}
        >${n || "Occurrence"}</a
      >
    </td>` : b`<td class=${e === "eventDate" || e === "year" ? "gbif-occurrence-table__nowrap" : ""}>${n}</td>`;
	}
	_renderBody() {
		if (this._status === "error") return b`<div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load occurrences from GBIF.</p></div>`;
		if (this._status === "loading") return b`<div class="gbif-card__body"><p class="gbif-card__state" role="status">Loading…</p></div>`;
		if (!this._rows.length) return b`<div class="gbif-card__body"><p class="gbif-card__state" role="status">No occurrences match these filters.</p></div>`;
		let e = this._columns;
		return b`
      <div class="gbif-occurrence-table__summary">
        <span>${this._total.toLocaleString()} occurrence${this._total === 1 ? "" : "s"}${this._total > 1e5 ? ` (the first ${K.toLocaleString()} can be paged through)` : ""}</span>
      </div>
      <div class="gbif-occurrence-table__scroll" role="region" aria-label="Occurrences" tabindex="0">
        <table class="gbif-occurrence-table__table" part="table">
          <thead>
            <tr>${e.map((e) => b`<th scope="col">${lr[e].label}</th>`)}</tr>
          </thead>
          <tbody>
            ${this._rows.map((t) => b`<tr>${e.map((e) => this._renderCell(e, t))}</tr>`)}
          </tbody>
        </table>
      </div>
      ${this._pageError ? b`<p class="gbif-occurrence-table__error" role="alert">Could not load that page. Showing the previous one.</p>` : S}
      ${this._pageCount > 1 ? this._renderPager() : S}
      <!-- The one thing this view announces after a search or a page change: how many, and where we are. -->
      <span class="gbif-visually-hidden" aria-live="polite">${this._total.toLocaleString()} occurrence${this._total === 1 ? "" : "s"}. Page ${this._page + 1} of ${this._pageCount}.</span>
    `;
	}
	render() {
		return this.renderSearchProblem() || b`
      <section class="gbif-card" part="card" aria-busy=${this._loading ? "true" : "false"}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || "Occurrences")}
        </header>
        ${this._renderBody()}
        ${this.config.showSource ? b`<footer class="gbif-card__footer" part="footer">${this.renderSource("Occurrence data from GBIF.")}</footer>` : S}
      </section>
    `;
	}
}, Pr = class extends J {
	static properties = {
		pageSize: {
			type: Number,
			attribute: "page-size"
		},
		licenses: { type: String },
		images: { type: String },
		_tiles: { state: !0 },
		_total: { state: !0 },
		_page: { state: !0 },
		_status: { state: !0 },
		_pageError: { state: !0 },
		_loading: { state: !0 },
		_fallback: { state: !0 },
		_broken: { state: !0 }
	};
	static styles = [...J.styles, s`
      .gbif-occurrence-gallery__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--gbif-gallery-tile, 10rem), 1fr));
        gap: 0.75rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .gbif-occurrence-gallery__figure {
        margin: 0;
      }
      .gbif-occurrence-gallery__tile {
        margin: 0;
        min-width: 0;
      }
      .gbif-occurrence-gallery__link {
        display: block;
        aspect-ratio: 1;
        overflow: hidden;
        border-radius: 4px;
        background: var(--gbif-color-media-background, #101418);
      }
      .gbif-occurrence-gallery__image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .gbif-occurrence-gallery__broken {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 0.5rem;
        color: #fff;
        font-size: 0.75rem;
        text-align: center;
      }
      .gbif-occurrence-gallery__caption {
        margin-top: 0.25rem;
        font-size: 0.7rem;
        line-height: 1.3;
        color: var(--gbif-color-muted, #596273);
        overflow-wrap: anywhere;
      }
      .gbif-occurrence-gallery__name {
        display: block;
        font-style: italic;
        color: var(--gbif-color-text, #1f2933);
      }
      .gbif-occurrence-gallery__summary {
        margin: 0 0 0.75rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-occurrence-gallery__pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.75rem;
        font-size: 0.75rem;
      }
      .gbif-occurrence-gallery__error {
        margin: 0.5rem 0 0;
        color: var(--gbif-color-error, #a32020);
        font-size: 0.8rem;
      }
    `];
	constructor() {
		super(), this.pageSize = 24, this.images = "gbif", this._tiles = [], this._total = 0, this._page = 0, this._status = "idle", this._pageError = !1, this._loading = !1, this._fallback = /* @__PURE__ */ new Set(), this._broken = /* @__PURE__ */ new Set(), this._run = 0;
	}
	get _size() {
		return R(this.pageSize, {
			min: 1,
			max: 100,
			fallback: 24
		});
	}
	get _pageCount() {
		return Math.max(1, Math.ceil(Math.min(this._total, K) / this._size));
	}
	updated(e) {
		super.updated(e);
		let t = !this._updatedOnce;
		this._updatedOnce = !0, !t && this.searchEl && ["pageSize", "licenses"].some((t) => e.has(t)) && this._load(0);
	}
	onSearchBound() {
		this._load(0);
	}
	onQueryChange() {
		this._load(0);
	}
	async _load(e, { paging: t = !1 } = {}) {
		let n = ++this._run;
		if (!this.searchEl.valid) this._tiles = [], this._status = "invalid", this._loading = !1;
		else {
			this._status = this._status === "ready" ? "ready" : "loading", this._pageError = !1, this._loading = !0;
			try {
				let { count: t, results: r } = await this.searchEl.fetchPage({
					limit: this._size,
					offset: e * this._size,
					mediaType: "StillImage"
				});
				if (n !== this._run) return;
				let i = jt(this.licenses);
				this._tiles = r.map(pr).filter((e) => e && (!i || i.has(e.licenseKey))), this._total = t, this._page = e, this._fallback = /* @__PURE__ */ new Set(), this._broken = /* @__PURE__ */ new Set(), this._status = "ready";
			} catch (e) {
				if (n !== this._run) return;
				t && this._status === "ready" ? this._pageError = !0 : (this._status = "error", this._tiles = []), z(this, "gbif-error", {
					component: this.localName,
					url: e.url,
					status: e.status ?? 0,
					message: e.message
				});
			} finally {
				n === this._run && (this._loading = !1);
			}
		}
	}
	_goTo(e) {
		e < 0 || e >= this._pageCount || this._loading || this._load(e, { paging: !0 });
	}
	_src(e) {
		return this.images === "original" || this._fallback.has(e.identifier) ? e.url : mr({
			apiBase: this.config.apiBase,
			occurrenceKey: e.occurrenceKey,
			identifier: e.identifier
		});
	}
	_onImageError(e) {
		this.images === "original" || this._fallback.has(e.identifier) ? (this._broken = /* @__PURE__ */ new Set([...this._broken, e.identifier]), z(this, "gbif-error", {
			component: this.localName,
			url: e.url,
			status: 0,
			message: "Image failed to load"
		})) : this._fallback = /* @__PURE__ */ new Set([...this._fallback, e.identifier]);
	}
	_renderTile(e) {
		let t = this.config.siteBase, n = `${e.name ?? "Occurrence image"}${e.country ? ` (${e.country})` : ""}`;
		return b`<li class="gbif-occurrence-gallery__tile">
      <figure class="gbif-occurrence-gallery__figure">
        <a
          class="gbif-occurrence-gallery__link"
          href=${H(t, e.occurrenceKey)}
          target="_blank"
          rel="noopener"
          aria-label=${`View this occurrence: ${n}`}
          @click=${(t) => B(this, t, "gbif-occurrence-select", {
			occurrenceKey: e.occurrenceKey,
			source: "gallery"
		})}
        >
          ${this._broken.has(e.identifier) ? b`<span class="gbif-occurrence-gallery__broken">Image failed to load</span>` : b`<img
                class="gbif-occurrence-gallery__image"
                src=${this._src(e)}
                alt=${n}
                loading="lazy"
                referrerpolicy="no-referrer"
                @error=${() => this._onImageError(e)}
              />`}
        </a>
        <figcaption class="gbif-occurrence-gallery__caption">
          ${e.name ? b`<span class="gbif-occurrence-gallery__name">${e.name}</span>` : S}
          ${e.rightsHolder ?? "Rights holder not stated"} ·
          ${e.license ? b`<a href=${e.license.url} target="_blank" rel="noopener">${e.license.label}</a>` : "Licence not stated"}
        </figcaption>
      </figure>
    </li>`;
	}
	_renderBody() {
		return this._status === "error" ? b`<p class="gbif-card__state" role="alert">Could not load images from GBIF.</p>` : this._status === "loading" ? b`<p class="gbif-card__state" role="status">Loading…</p>` : this._tiles.length ? b`
      <p class="gbif-occurrence-gallery__summary">${this._total.toLocaleString()} occurrence${this._total === 1 ? "" : "s"} with images</p>
      <ul class="gbif-occurrence-gallery__grid" part="grid">${this._tiles.map((e) => this._renderTile(e))}</ul>
      ${this._pageError ? b`<p class="gbif-occurrence-gallery__error" role="alert">Could not load that page. Showing the previous one.</p>` : S}
      ${this._pageCount > 1 ? b`<div class="gbif-occurrence-gallery__pager">
            <button type="button" class="gbif-button" aria-disabled=${this._page === 0 || this._loading ? "true" : "false"} @click=${() => this._goTo(this._page - 1)}>‹ Prev</button>
            <span>Page ${(this._page + 1).toLocaleString()} of ${this._pageCount.toLocaleString()}</span>
            <button type="button" class="gbif-button" aria-disabled=${this._page >= this._pageCount - 1 || this._loading ? "true" : "false"} @click=${() => this._goTo(this._page + 1)}>Next ›</button>
          </div>` : S}
      <span class="gbif-visually-hidden" aria-live="polite">${this._total.toLocaleString()} occurrence${this._total === 1 ? "" : "s"} with images. Page ${this._page + 1} of ${this._pageCount}.</span>
    ` : b`<p class="gbif-card__state" role="status">No images match these filters.</p>`;
	}
	render() {
		return this.renderSearchProblem() || b`
      <section class="gbif-card" part="card" aria-busy=${this._loading ? "true" : "false"}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || "Images")}
        </header>
        <div class="gbif-card__body" part="body">${this._renderBody()}</div>
        ${this.config.showSource ? b`<footer class="gbif-card__footer" part="footer">${this.renderSource("Images from GBIF occurrence records.")}</footer>` : S}
      </section>
    `;
	}
}, Fr = [
	{
		key: "record-level",
		label: "Record-level",
		about: "The record itself, and who holds and licenses it.",
		terms: [
			"type",
			"modified",
			"language",
			"license",
			"rightsHolder",
			"accessRights",
			"bibliographicCitation",
			"references",
			"identifier",
			"institutionID",
			"collectionID",
			"datasetID",
			"institutionCode",
			"collectionCode",
			"datasetName",
			"ownerInstitutionCode",
			"basisOfRecord",
			"informationWithheld",
			"dataGeneralizations",
			"dynamicProperties"
		]
	},
	{
		key: "occurrence",
		label: "Occurrence",
		about: "An organism at a place and time, as recorded.",
		terms: [
			"occurrenceID",
			"catalogNumber",
			"recordNumber",
			"recordedBy",
			"recordedByID",
			"individualCount",
			"organismQuantity",
			"organismQuantityType",
			"sex",
			"lifeStage",
			"reproductiveCondition",
			"caste",
			"behavior",
			"vitality",
			"establishmentMeans",
			"degreeOfEstablishment",
			"pathway",
			"occurrenceStatus",
			"otherCatalogNumbers",
			"associatedMedia",
			"associatedOccurrences",
			"associatedReferences",
			"associatedTaxa",
			"occurrenceRemarks"
		]
	},
	{
		key: "organism",
		label: "Organism",
		about: "The individual organism, which may be recorded more than once.",
		terms: [
			"organismID",
			"organismName",
			"organismScope",
			"associatedOrganisms",
			"previousIdentifications",
			"organismRemarks"
		]
	},
	{
		key: "material-entity",
		label: "Material entity",
		about: "The specimen or sample that was kept.",
		terms: [
			"materialEntityID",
			"materialSampleID",
			"preparations",
			"disposition",
			"verbatimLabel",
			"associatedSequences",
			"materialEntityRemarks"
		]
	},
	{
		key: "event",
		label: "Event",
		about: "When and how the organism was observed or collected.",
		terms: [
			"eventID",
			"parentEventID",
			"eventType",
			"fieldNumber",
			"eventDate",
			"eventTime",
			"startDayOfYear",
			"endDayOfYear",
			"year",
			"month",
			"day",
			"verbatimEventDate",
			"habitat",
			"samplingProtocol",
			"sampleSizeValue",
			"sampleSizeUnit",
			"samplingEffort",
			"fieldNotes",
			"eventRemarks"
		]
	},
	{
		key: "location",
		label: "Location",
		about: "Where it happened.",
		terms: /* @__PURE__ */ "locationID.higherGeographyID.higherGeography.continent.waterBody.islandGroup.island.country.countryCode.stateProvince.county.municipality.locality.verbatimLocality.verbatimElevation.verticalDatum.minimumElevationInMeters.maximumElevationInMeters.verbatimDepth.minimumDepthInMeters.maximumDepthInMeters.minimumDistanceAboveSurfaceInMeters.maximumDistanceAboveSurfaceInMeters.locationAccordingTo.locationRemarks.decimalLatitude.decimalLongitude.geodeticDatum.coordinateUncertaintyInMeters.coordinatePrecision.pointRadiusSpatialFit.verbatimCoordinates.verbatimLatitude.verbatimLongitude.verbatimCoordinateSystem.verbatimSRS.footprintWKT.footprintSRS.footprintSpatialFit.georeferencedBy.georeferencedDate.georeferenceProtocol.georeferenceSources.georeferenceRemarks.georeferenceVerificationStatus".split(".")
	},
	{
		key: "geological-context",
		label: "Geological context",
		about: "Where the material sits in the geological record.",
		terms: [
			"geologicalContextID",
			"earliestEonOrLowestEonothem",
			"latestEonOrHighestEonothem",
			"earliestEraOrLowestErathem",
			"latestEraOrHighestErathem",
			"earliestPeriodOrLowestSystem",
			"latestPeriodOrHighestSystem",
			"earliestEpochOrLowestSeries",
			"latestEpochOrHighestSeries",
			"earliestAgeOrLowestStage",
			"latestAgeOrHighestStage",
			"lowestBiostratigraphicZone",
			"highestBiostratigraphicZone",
			"lithostratigraphicTerms",
			"group",
			"formation",
			"member",
			"bed"
		]
	},
	{
		key: "identification",
		label: "Identification",
		about: "How the organism was identified, and by whom.",
		terms: [
			"identificationID",
			"verbatimIdentification",
			"identificationQualifier",
			"typeStatus",
			"identifiedBy",
			"identifiedByID",
			"dateIdentified",
			"identificationReferences",
			"identificationVerificationStatus",
			"identificationRemarks"
		]
	},
	{
		key: "taxon",
		label: "Taxon",
		about: "The name it was identified as, and where that name sits.",
		terms: /* @__PURE__ */ "taxonID.scientificNameID.acceptedNameUsageID.parentNameUsageID.originalNameUsageID.nameAccordingToID.namePublishedInID.taxonConceptID.scientificName.acceptedNameUsage.parentNameUsage.originalNameUsage.nameAccordingTo.namePublishedIn.namePublishedInYear.higherClassification.kingdom.phylum.class.order.superfamily.family.subfamily.tribe.subtribe.genus.genericName.subgenus.infragenericEpithet.specificEpithet.infraspecificEpithet.cultivarEpithet.taxonRank.verbatimTaxonRank.scientificNameAuthorship.vernacularName.nomenclaturalCode.taxonomicStatus.nomenclaturalStatus.taxonRemarks.acceptedScientificName.species.iucnRedListCategory".split(".")
	},
	{
		key: "gbif",
		label: "GBIF processing",
		about: "GBIF's own identifiers, dates, quality flags and derived values (elevation, depth, administrative areas). Not Darwin Core.",
		terms: /* @__PURE__ */ "gbifID,datasetKey,publishingOrgKey,installationKey,hostingOrganizationKey,publishingCountry,publishedByGbifRegion,gbifRegion,protocol,crawlId,lastCrawled,lastParsed,lastInterpreted,issues,taxonKey,acceptedTaxonKey,kingdomKey,phylumKey,classKey,orderKey,familyKey,genusKey,speciesKey,isSequenced,isInCluster,dnaSequenceID,projectId,networkKeys,repatriated,elevation,elevationAccuracy,depth,depthAccuracy,distanceFromCentroidInMeters,gadm.level0,gadm.level1,gadm.level2,gadm.level3".split(",")
	},
	{
		key: "other",
		label: "Other terms",
		about: "Terms that are not part of Darwin Core or GBIF's own. Where the publisher used them, they are shown as published.",
		terms: []
	}
], Ir = /* @__PURE__ */ new Map();
for (let e of Fr) e.terms.forEach((t, n) => Ir.set(t, {
	group: e.key,
	order: n
}));
var Lr = [
	"http://rs.tdwg.org/dwc/terms/",
	"http://purl.org/dc/terms/",
	"http://purl.org/dc/elements/1.1/",
	"http://rs.gbif.org/terms/1.0/"
], Rr = "http://unknown.org/", zr = /* @__PURE__ */ new Set([
	"extensions",
	"media",
	"facts",
	"relations",
	"identifiers",
	"classifications",
	"key"
]);
function Y(e) {
	let t = String(e);
	return t.slice(Math.max(t.lastIndexOf("/"), t.lastIndexOf("#")) + 1) || t;
}
var Br = {
	gbif: "GBIF",
	iucn: "IUCN",
	wkt: "WKT",
	srs: "SRS",
	url: "URL",
	uri: "URI",
	doi: "DOI",
	dna: "DNA",
	rna: "RNA",
	id: "ID",
	ids: "IDs"
};
function Vr(e) {
	return String(e).replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").trim().split(/\s+/).map((e, t) => Br[e.toLowerCase()] ? Br[e.toLowerCase()] : e === e.toUpperCase() && e.length > 1 ? e : t === 0 ? e.charAt(0).toUpperCase() + e.slice(1) : e.toLowerCase()).join(" ") || String(e);
}
function Hr(e) {
	let t = String(e).replace(/[_-]+/g, " ").trim().toLowerCase();
	return t.charAt(0).toUpperCase() + t.slice(1);
}
function Ur(e) {
	let t = typeof e == "number" ? String(e) : e;
	return typeof t == "string" && /^\d{1,19}$/.test(t.trim()) ? t.trim() : void 0;
}
var Wr = /* @__PURE__ */ new Set([
	"recordedBy",
	"recordedByID",
	"identifiedBy",
	"identifiedByID",
	"georeferencedBy",
	"georeferenceSources",
	"otherCatalogNumbers",
	"associatedMedia",
	"associatedOccurrences",
	"associatedReferences",
	"associatedSequences",
	"associatedTaxa",
	"associatedOrganisms",
	"previousIdentifications",
	"preparations",
	"typeStatus",
	"lithostratigraphicTerms",
	"establishmentMeans",
	"identificationQualifier",
	"issues",
	"networkKeys",
	"projectId"
]), Gr = /* @__PURE__ */ new Set([
	"elevation",
	"elevationAccuracy",
	"depth",
	"depthAccuracy"
]), Kr = (e) => typeof e == "string" || typeof e == "number" || typeof e == "boolean", qr = /* @__PURE__ */ new Set([
	"basisOfRecord",
	"occurrenceStatus",
	"taxonRank",
	"taxonomicStatus",
	"nomenclaturalStatus",
	"protocol",
	"establishmentMeans",
	"degreeOfEstablishment",
	"pathway",
	"typeStatus"
]), Jr = /* @__PURE__ */ new Set([
	"continent",
	"gbifRegion",
	"publishedByGbifRegion"
]), Yr = (e) => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(e) && e.length > 2;
function Xr(e) {
	return String(e).replace(/[_-]+/g, " ").trim().toLowerCase().replace(/(^|\s)\S/g, (e) => e.toUpperCase());
}
function Zr(e, t, n = !1) {
	if (typeof t == "boolean") return t ? "Yes" : "No";
	if (typeof t == "number") return Number.isFinite(t) ? e === "decimalLatitude" || e === "decimalLongitude" ? String(Number(t.toFixed(6))) : /InMeters$/.test(e) || Gr.has(e) ? `${t} m` : String(t) : null;
	if (typeof t == "string") {
		let r = t.trim();
		if (!r) return null;
		if (n && Yr(r)) {
			if (qr.has(e)) return Hr(r);
			if (Jr.has(e)) return Xr(r);
		}
		return r;
	}
	return null;
}
function Qr(e, t, n = !1) {
	let r = Array.isArray(t) && t.length && t.every(Kr) ? t : typeof t == "string" && t.includes("|") && Wr.has(e) ? t.split("|") : null;
	if (r) {
		let t = r.map((t) => Zr(e, typeof t == "string" ? t.trim() : t, n)).filter(Boolean);
		return t.length ? e === "issues" ? { text: t.map(Hr).join(", ") } : t.length === 1 ? Qr(e, r.find((t) => Zr(e, typeof t == "string" ? t.trim() : t, n)), n) : {
			text: t.join(" | "),
			parts: t.map((e) => ({
				text: e,
				...I(e) ? { href: I(e) } : {}
			}))
		} : null;
	}
	let i = Zr(e, t, n);
	if (i === null) return null;
	if (e === "license") {
		let e = L(i);
		if (e) return {
			text: e.label,
			href: e.url
		};
	}
	let a = typeof t == "string" && /^\S+$/.test(i) ? I(i) : null;
	return a ? {
		text: i,
		href: a
	} : { text: i };
}
function $r(e) {
	try {
		let t = new URL(e);
		return `${t.host.toLowerCase()}${t.pathname.replace(/\/$/, "")}${t.search}`;
	} catch {
		return e;
	}
}
var ei = /^[+-]?\d+(\.\d+)?$/;
function ti(e, t) {
	if (e.text.toLowerCase() === t.text.toLowerCase()) return !0;
	let n = (e) => /^\d{4}-\d{2}-\d{2}T/.test(e.text), r = (e) => /(Z|[+-]\d{2}:?\d{2})$/i.test(e.text);
	if (n(e) && n(t) && r(e) === r(t) && Date.parse(e.text) === Date.parse(t.text)) return !0;
	let i = (e) => e.text.replace(/ m$/, "");
	return ei.test(i(e)) && ei.test(i(t)) && Number(i(e)) === Number(i(t)) ? !0 : !!e.href && !!t.href && $r(e.href) === $r(t.href);
}
function ni(e) {
	if (e.startsWith("http://purl.org/dc/terms/")) return "dcterms";
	if (e.startsWith("http://purl.org/dc/elements/1.1/")) return "dc";
	if (e.startsWith("http://rs.tdwg.org/dwc/terms/")) return "dwc";
	if (e.startsWith("http://rs.gbif.org/terms/")) return "gbif";
	try {
		return new URL(e).host;
	} catch {
		return "other";
	}
}
function ri(e) {
	let t = Lr.find((t) => e.startsWith(t));
	return t ? e.slice(t.length) : null;
}
function ii({ interpreted: e, verbatim: t } = {}) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = (e, t) => {
		let i = r.get(e.toLowerCase());
		return i ? n.get(i) : (n.set(e, {
			name: e,
			label: Vr(Y(e)),
			value: null,
			published: null,
			uri: t
		}), r.set(e.toLowerCase(), e), n.get(e));
	}, a = [];
	if (e && typeof e == "object") for (let [t, n] of Object.entries(e)) {
		if (zr.has(t)) continue;
		let e = Qr(Y(t), n, !0);
		if (!e) continue;
		if (t.startsWith(Rr)) {
			a.push([t, e]);
			continue;
		}
		let r = t.startsWith("http") ? ri(t) ?? t : t;
		i(r, t.startsWith("http") ? t : void 0).value = e;
	}
	if (e?.gadm && typeof e.gadm == "object") for (let t = 0; t <= 3; t += 1) {
		let n = e.gadm[`level${t}`], r = typeof n?.name == "string" ? n.name.trim() : "";
		if (!r) continue;
		let a = i(`gadm.level${t}`);
		a.label = `Administrative area, level ${t} (GADM)`, a.value = { text: typeof n.gid == "string" && n.gid.trim() ? `${r} (${n.gid.trim()})` : r };
	}
	let o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
	if (t && typeof t == "object") for (let [e, n] of Object.entries(t)) {
		if (!e.startsWith("http")) continue;
		let t = Qr(Y(e), n);
		if (!t) continue;
		let r = ri(e) ?? e, a = i(r, e);
		if (s.has(a) && s.get(a) !== e && (r = e, a = i(e, e), a.label = `${Vr(Y(e))} (${ni(e)})`), a.uri || (a.uri = e), a.published = t, s.set(a, e), !ri(e)) {
			let t = o.get(Y(e).toLowerCase()) ?? [];
			t.push(a), o.set(Y(e).toLowerCase(), t);
		}
	}
	for (let [e, t] of a) {
		let n = o.get(Y(e).toLowerCase()) ?? [];
		(n.length === 1 ? n[0] : i(e, e)).value = t;
	}
	let c = new Map(Fr.map((e) => [e.key, []]));
	for (let e of n.values()) {
		let t = Ir.get(e.name) ?? (e.name.startsWith("http") ? Ir.get(ri(e.name) ?? "") : void 0), n = t ? t.group : "other", r = e.value ?? e.published, i = e.value && e.published && !ti(e.value, e.published) ? e.published.text : void 0;
		c.get(n).push({
			name: e.name,
			label: e.label,
			text: r.text,
			...r.href ? { href: r.href } : {},
			...r.parts ? { parts: r.parts } : {},
			...i ? { published: i } : {},
			...e.uri ? { uri: e.uri } : {},
			_order: t ? t.order : 2 ** 53 - 1
		});
	}
	return Fr.map((e) => {
		let t = c.get(e.key).sort((e, t) => e._order - t._order || e.label.localeCompare(t.label)).map(({ _order: e, ...t }) => t);
		return {
			key: e.key,
			label: e.label,
			about: e.about,
			rows: t
		};
	}).filter((e) => e.rows.length);
}
var ai = 100;
function oi(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return [];
	let t = [];
	for (let [n, r] of Object.entries(e)) {
		let e = (Array.isArray(r) ? r : []).filter((e) => e && typeof e == "object" && !Array.isArray(e));
		if (!e.length) continue;
		let i = [], a = /* @__PURE__ */ new Set();
		for (let t of e) for (let [e, n] of Object.entries(t)) !a.has(e) && Qr(Y(e), n) !== null && (a.add(e), i.push({
			term: e,
			label: Vr(Y(e))
		}));
		i.length && t.push({
			rowType: n,
			name: Y(n),
			label: Vr(Y(n)),
			columns: i,
			rows: e.slice(0, ai).map((e) => i.map(({ term: t }) => Qr(Y(t), e[t]) ?? { text: "" })),
			omitted: Math.max(0, e.length - ai)
		});
	}
	return t;
}
var X = (e) => typeof e == "string" && e.trim() ? e.trim() : void 0;
function si(e) {
	let t = [], n = [];
	for (let r of Array.isArray(e?.media) ? e.media : []) {
		if (!r || typeof r != "object") continue;
		let e = I(r.identifier);
		if (!e) continue;
		let i = L(r.license), a = {
			identifier: r.identifier,
			url: e,
			type: X(r.type),
			format: X(r.format),
			title: X(r.title),
			description: X(r.description),
			creator: X(r.creator),
			rightsHolder: X(r.rightsHolder),
			publisher: X(r.publisher),
			created: X(r.created),
			references: I(r.references) ?? void 0,
			license: i
		};
		(r.type === "StillImage" ? t : n).push(a);
	}
	return {
		images: t,
		other: n
	};
}
var Z = (e) => typeof e == "number" ? e : typeof e == "string" && e.trim() !== "" ? Number(e) : NaN, ci = {
	ZERO_COORDINATE: "the coordinates are 0°, 0°",
	COORDINATE_OUT_OF_RANGE: "the coordinates are outside the valid range",
	COORDINATE_INVALID: "the coordinates could not be read",
	COUNTRY_COORDINATE_MISMATCH: "the coordinates are outside the stated country",
	PRESUMED_NEGATED_LATITUDE: "the sign of the latitude looks reversed",
	PRESUMED_NEGATED_LONGITUDE: "the sign of the longitude looks reversed",
	PRESUMED_SWAPPED_COORDINATE: "latitude and longitude look swapped",
	COORDINATE_REPROJECTION_FAILED: "the coordinates could not be converted to WGS84",
	COORDINATE_REPROJECTION_SUSPICIOUS: "the conversion of the coordinates to WGS84 looks wrong",
	COORDINATE_UNCERTAINTY_METERS_INVALID: "the coordinate uncertainty is not valid",
	COORDINATE_PRECISION_INVALID: "the coordinate precision is not valid"
}, li = 111;
function ui(e) {
	let t = [], n = e && typeof e == "object" ? e : {}, r = (e) => X(e) && X(e).length > 400 ? `${X(e).slice(0, 400)}…` : X(e);
	r(n.dataGeneralizations) && t.push({
		kind: "generalized",
		text: `The location was made less exact on purpose: ${r(n.dataGeneralizations)}`
	}), r(n.informationWithheld) && t.push({
		kind: "withheld",
		text: `Information was withheld: ${r(n.informationWithheld)}`
	});
	let i = (Array.isArray(n.issues) ? n.issues : []).filter((e) => typeof e == "string"), a = i.filter((e) => Object.hasOwn(ci, e)).map((e) => ci[e]), o = Z(n.decimalLatitude), s = Z(n.decimalLongitude);
	o === 0 && s === 0 && !i.includes("ZERO_COORDINATE") && a.unshift(ci.ZERO_COORDINATE), a.length && t.push({
		kind: "flagged",
		text: `Do not rely on this location: ${a.join("; ")}.`
	});
	let c = Z(n.coordinatePrecision);
	if (i.includes("COORDINATE_ROUNDED") || Number.isFinite(c) && c >= .01) {
		let e = Number.isFinite(c) && c >= .01 ? ` to ${c}° (about ${Math.round(c * li)} km)` : "";
		t.push({
			kind: "coarse",
			text: `The coordinates are rounded${e}, so the point is only roughly where it happened.`
		});
	}
	let l = Z(n.coordinateUncertaintyInMeters);
	return Number.isFinite(l) && l >= 1e5 && t.push({
		kind: "coarse",
		text: `The location is uncertain by ${Math.round(l / 1e3).toLocaleString("en")} km.`
	}), t;
}
function di(e) {
	let t = Z(e?.decimalLatitude), n = Z(e?.decimalLongitude);
	if (!Number.isFinite(t) || !Number.isFinite(n) || Math.abs(t) > 90 || Math.abs(n) > 180) return null;
	let r = Z(e.coordinateUncertaintyInMeters), i = ui(e);
	return {
		lat: t,
		lng: n,
		uncertainty: Number.isFinite(r) && r > 0 ? r : null,
		notes: i,
		approximate: i.some((e) => e.kind === "generalized" || e.kind === "coarse" || e.kind === "flagged")
	};
}
// src/shared/record.js
async function fi({ apiBase: e, key: t }) {
	let n = Ur(t);
	if (!n) throw Error("An occurrence key is digits only.");
	let r = M(j(e, `/v1/occurrence/${n}/verbatim`)).then((e) => ({ data: e }), (e) => ({ error: e })), i;
	try {
		i = await M(j(e, `/v1/occurrence/${n}`));
	} catch (e) {
		if (e.status === 404 || e.status === 410) return { found: !1 };
		throw e;
	}
	if (!i || typeof i != "object" || Array.isArray(i)) return { found: !1 };
	let { data: a, error: o } = await r;
	return {
		found: !0,
		interpreted: i,
		verbatim: a && typeof a == "object" && !Array.isArray(a) ? a : null,
		verbatimError: o && o.status !== 404 && o.status !== 410 ? o : void 0
	};
}
// src/components/gbif-occurrence-record.js
var pi = class extends E {
	static properties = {
		occurrenceKey: {
			type: String,
			attribute: "occurrence-key",
			reflect: !0
		},
		apiBase: {
			type: String,
			attribute: "api-base"
		},
		siteBase: {
			type: String,
			attribute: "site-base"
		},
		_status: { state: !0 }
	};
	static styles = [Pt, s`
      :host {
        display: contents;
      }
      .gbif-record__state {
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--gbif-color-border, #d5dbe1);
        border-radius: var(--gbif-radius, 8px);
        background: var(--gbif-color-surface, #fff);
        color: var(--gbif-color-text, #1f2933);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: var(--gbif-font-size, 0.875rem);
      }
    `];
	constructor() {
		super(), this._status = "idle", this._data = null, this._view = null, this._run = 0;
	}
	get status() {
		return this._status;
	}
	get config() {
		return F(this);
	}
	get interpreted() {
		return this._data?.interpreted ?? null;
	}
	get verbatim() {
		return this._data?.verbatim ?? null;
	}
	getView() {
		return this._status === "ready" ? (this._view ??= {
			groups: ii({
				interpreted: this.interpreted,
				verbatim: this.verbatim
			}),
			extensions: oi(this.verbatim?.extensions),
			media: si(this.interpreted),
			point: di(this.interpreted)
		}, this._view) : {
			groups: [],
			extensions: [],
			media: {
				images: [],
				other: []
			},
			point: null
		};
	}
	willUpdate(e) {
		(e.has("occurrenceKey") || e.has("apiBase")) && this._load();
	}
	connectedCallback() {
		super.connectedCallback(), this._stopWatchingConfig = bt(() => this.hasUpdated && this._load());
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._stopWatchingConfig?.();
	}
	_set(e) {
		this._status = e, z(this, "gbif-record-change", {
			status: e,
			occurrenceKey: Ur(this.occurrenceKey)
		});
	}
	async _load() {
		let e = ++this._run;
		if (this._data = null, this._view = null, !this.occurrenceKey) {
			this._set("idle");
			return;
		}
		let t = Ur(this.occurrenceKey);
		if (!t) this._set("invalid"), z(this, "gbif-error", {
			component: this.localName,
			url: void 0,
			status: 0,
			message: "An occurrence key is digits only."
		});
		else {
			this._set("loading");
			try {
				let n = await fi({
					apiBase: this.config.apiBase,
					key: t
				});
				if (e !== this._run) return;
				if (!n.found) {
					this._set("notfound"), z(this, "gbif-record-notfound", { occurrenceKey: t });
					return;
				}
				this._data = n, this._set("ready");
				let r = n.interpreted, i = (e) => typeof e == "string" ? e : void 0;
				if (z(this, "gbif-record-load", {
					occurrenceKey: t,
					scientificName: i(r.scientificName),
					kingdom: i(r.kingdom),
					basisOfRecord: i(r.basisOfRecord),
					datasetName: i(r.datasetName),
					country: i(r.country),
					eventDate: i(r.eventDate)
				}), n.verbatimError) {
					let { url: e, status: t, message: r } = n.verbatimError;
					z(this, "gbif-error", {
						component: this.localName,
						url: e,
						status: t ?? 0,
						message: `The record as published could not be loaded (${r}).`
					});
				}
			} catch (t) {
				if (e !== this._run) return;
				this._set("error"), z(this, "gbif-error", {
					component: this.localName,
					url: t.url,
					status: t.status ?? 0,
					message: t.message
				});
			}
		}
	}
	render() {
		let e = {
			notfound: b`Occurrence <strong>${this.occurrenceKey}</strong> was not found.`,
			invalid: b`<strong>${this.occurrenceKey}</strong> is not an occurrence key. A key is made of digits only.`,
			error: b`Could not load this occurrence from GBIF.`
		}[this._status];
		return b`${e ? b`<p class="gbif-record__state" role="alert">${e}</p>` : S}<slot></slot>`;
	}
}, Q = class extends Dr {
	static linkTag = "gbif-occurrence-record";
	static linkProperty = "record";
	static linkEvent = "gbif-record-change";
	static linkReady = "getView";
	static properties = {
		record: { type: String },
		_version: { state: !0 }
	};
	get recordEl() {
		return this.linked;
	}
	get view() {
		return this.recordEl?.getView() ?? {
			groups: [],
			extensions: [],
			media: {
				images: [],
				other: []
			},
			point: null
		};
	}
	get ready() {
		return this._linkStatus === "bound" && this.recordEl?.status === "ready";
	}
	get config() {
		let e = F({ hideSource: this.hideSource });
		return {
			...this.recordEl?.config ?? e,
			showSource: e.showSource
		};
	}
	renderRecordProblem() {
		return this._linkStatus === "missing" ? b`<p class="gbif-card__state" role="alert">No occurrence record was found for this component.</p>` : null;
	}
	onLinked() {
		this._version = (this._version ?? 0) + 1, this.onRecordChange();
	}
	onLinkedChange() {
		this._version = (this._version ?? 0) + 1, this.onRecordChange();
	}
	onRecordChange() {}
}, mi = [
	"recordedBy",
	"recordedByID",
	"identifiedBy",
	"identifiedByID",
	"georeferencedBy"
], hi = (e) => String(e).toLowerCase().replace(/[\s_]+/g, "-"), gi = class extends Q {
	static properties = {
		groups: { type: String },
		hideTerms: {
			type: String,
			attribute: "hide-terms"
		}
	};
	static styles = [...Q.styles, s`
      /* Columns, not a grid, so that short cards do not leave gaps under them. The cards run down the first
         column and then the next, in Darwin Core's order. */
      .gbif-groups {
        columns: var(--gbif-group-min-width, 22rem) auto;
        column-gap: 1rem;
      }
      .gbif-groups > .gbif-card {
        break-inside: avoid;
        margin-bottom: 1rem;
      }
      .gbif-groups__part {
        display: block;
      }
      .gbif-groups__note {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: 0.75rem;
      }
      .gbif-groups__about {
        margin: 0 0 0.75rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.8rem;
      }
      .gbif-groups__list {
        display: grid;
        gap: 0.5rem 0;
        margin: 0;
        container-type: inline-size;
      }
      .gbif-groups__row {
        display: grid;
        grid-template-columns: minmax(7rem, 38%) 1fr;
        gap: 0.5rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
      }
      .gbif-groups__row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      /* In a narrow card the term goes above its value; side by side, a word of the value would get a line to itself. */
      @container (max-width: 20rem) {
        .gbif-groups__row {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }
      .gbif-groups__term {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.78rem;
      }
      .gbif-groups__value {
        margin: 0;
        unicode-bidi: plaintext;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .gbif-groups__published {
        display: block;
        margin-top: 0.15rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
    `];
	_chosen(e) {
		if (typeof this.groups != "string" || !this.groups.trim()) return e;
		let t = this.groups.split(/[\s,]+/).filter(Boolean).map(hi);
		return [...new Set(t)].map((t) => e.find((e) => e.key === t || hi(e.label) === t)).filter(Boolean);
	}
	_withoutHidden(e) {
		if (typeof this.hideTerms != "string" || !this.hideTerms.trim()) return e;
		let t = this.hideTerms.split(/[\s,]+/).filter(Boolean).map((e) => e.toLowerCase()), n = new Set(t.flatMap((e) => e === "people" ? mi : [e]).map((e) => e.toLowerCase()));
		return e.map((e) => ({
			...e,
			rows: e.rows.filter((e) => !n.has(e.name.toLowerCase()))
		})).filter((e) => e.rows.length);
	}
	_renderRow(e) {
		return b`<div class="gbif-groups__row">
      <dt class="gbif-groups__term" title=${e.uri ?? ""}>${e.label}</dt>
      <dd class="gbif-groups__value">
        ${e.parts ? e.parts.map((e) => b`<span class="gbif-groups__part">${e.href ? b`<a href=${e.href} target="_blank" rel="noopener">${e.text}</a>` : e.text}</span>`) : e.href ? b`<a href=${e.href} target="_blank" rel="noopener">${e.text}</a>` : e.text}
        ${e.published ? b`<span class="gbif-groups__published">As published: ${e.published}</span>` : S}
      </dd>
    </div>`;
	}
	render() {
		let e = this.renderRecordProblem();
		if (e) return e;
		if (!this.ready) return S;
		let t = this._chosen(this._withoutHidden(this.view.groups));
		return t.length ? b`
      <div class="gbif-groups" part="groups">
        ${t.map((e) => b`<section class="gbif-card" part="card" data-group=${e.key}>
            <header class="gbif-card__header" part="header">
              <span class="gbif-card__badge">GBIF</span>
              ${this.renderTitle(t.length === 1 && this.heading ? this.heading : e.label)}
            </header>
            <div class="gbif-card__body" part="body">
              <p class="gbif-groups__about">${e.about}</p>
              <dl class="gbif-groups__list">${e.rows.map((e) => this._renderRow(e))}</dl>
            </div>
          </section>`)}
      </div>
      ${this.config.showSource ? b`<div class="gbif-groups__note">${this.renderSource("Occurrence record from GBIF, sorted into Darwin Core groups.")}</div>` : S}
    ` : S;
	}
}, _i = class extends Q {
	static properties = {
		images: { type: String },
		licenses: { type: String },
		limit: { type: Number },
		_fallback: { state: !0 },
		_broken: { state: !0 }
	};
	static styles = [...Q.styles, s`
      .gbif-images__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--gbif-record-image-min, 14rem)), 1fr));
        gap: 1rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .gbif-images__figure {
        margin: 0;
      }
      .gbif-images__link {
        display: block;
        overflow: hidden;
        border-radius: 4px;
        background: var(--gbif-color-media-background, #101418);
      }
      .gbif-images__image {
        display: block;
        width: 100%;
        height: auto;
        max-height: 24rem;
        object-fit: contain;
      }
      .gbif-images__broken {
        display: block;
        padding: 2rem 0.5rem;
        color: #fff;
        font-size: 0.8rem;
        text-align: center;
      }
      .gbif-images__caption {
        margin-top: 0.35rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      .gbif-images__title {
        display: block;
        color: var(--gbif-color-text, #1f2933);
        font-weight: 600;
      }
      .gbif-images__other {
        margin: 1rem 0 0;
        padding: 0;
        list-style: none;
        font-size: 0.8rem;
      }
    `];
	constructor() {
		super(), this.images = "gbif", this._fallback = /* @__PURE__ */ new Set(), this._broken = /* @__PURE__ */ new Set();
	}
	onRecordChange() {
		this._fallback = /* @__PURE__ */ new Set(), this._broken = /* @__PURE__ */ new Set();
	}
	_src(e) {
		let t = Ur(this.recordEl?.occurrenceKey);
		return this.images === "original" || this._fallback.has(e.identifier) || !t ? e.url : mr({
			apiBase: this.config.apiBase,
			occurrenceKey: t,
			identifier: e.identifier,
			width: 600
		});
	}
	_onError(e) {
		this.images === "original" || this._fallback.has(e.identifier) ? (this._broken = /* @__PURE__ */ new Set([...this._broken, e.identifier]), z(this, "gbif-error", {
			component: this.localName,
			url: e.url,
			status: 0,
			message: "Image failed to load"
		})) : this._fallback = /* @__PURE__ */ new Set([...this._fallback, e.identifier]);
	}
	_renderCredit(e) {
		return [
			e.creator ? b`By ${e.creator}` : S,
			e.rightsHolder && e.rightsHolder !== e.creator ? b`Rights holder: ${e.rightsHolder}` : S,
			e.publisher ? b`Published by ${e.publisher}` : S,
			e.license ? b`<a href=${e.license.url} target="_blank" rel="noopener">${e.license.label}</a>` : b`Licence not stated`,
			e.created ? b`${e.created.slice(0, 10)}` : S
		].filter((e) => e !== S).map((e, t) => b`${t ? " · " : ""}${e}`);
	}
	_renderImage(e) {
		let t = this.recordEl?.interpreted?.scientificName, n = e.description ?? e.title ?? `${typeof t == "string" && t ? `Image of ${t}` : "Image"}${e.creator ? ` by ${e.creator}` : ""}`;
		return b`<li>
      <figure class="gbif-images__figure">
        <a class="gbif-images__link" href=${e.references ?? e.url} target="_blank" rel="noopener" aria-label=${`Open this image at its publisher: ${n}`}>
          ${this._broken.has(e.identifier) ? b`<span class="gbif-images__broken">Image failed to load</span>` : b`<img class="gbif-images__image" src=${this._src(e)} alt=${n} loading="lazy" referrerpolicy="no-referrer" @error=${() => this._onError(e)} />`}
        </a>
        <figcaption class="gbif-images__caption">
          ${e.title ? b`<span class="gbif-images__title">${e.title}</span>` : S}
          ${this._renderCredit(e)}
        </figcaption>
      </figure>
    </li>`;
	}
	_shown(e) {
		let t = jt(this.licenses), n = t ? e.filter((e) => t.has(e.license?.key ?? "unknown")) : e, r = Number.isInteger(this.limit) && this.limit > 0 ? Math.min(this.limit, 200) : Infinity;
		return {
			images: n.slice(0, r),
			hidden: e.length - n.length
		};
	}
	render() {
		let e = this.renderRecordProblem();
		if (e) return e;
		if (!this.ready) return S;
		let { other: t } = this.view.media, { images: n, hidden: r } = this._shown(this.view.media.images);
		return !n.length && !t.length ? S : b`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || (n.length ? "Images" : "Media"))}
        </header>
        <div class="gbif-card__body" part="body">
          ${n.length ? b`<ul class="gbif-images__grid" part="grid">${n.map((e) => this._renderImage(e))}</ul>` : S}
          ${r ? b`<p class="gbif-images__caption">${r} image${r === 1 ? "" : "s"} not shown, because of the licence filter.</p>` : S}
          ${t.length ? b`<ul class="gbif-images__other">
                ${t.map((e) => b`<li>
                    <a href=${e.url} target="_blank" rel="noopener">${e.title ?? e.type ?? "Media"}${e.format ? ` (${e.format})` : ""}</a>
                    ${e.type ? b`<span class="gbif-images__caption"> · ${e.type}</span>` : S}
                    ${e.license ? b` · <a class="gbif-images__caption" href=${e.license.url} target="_blank" rel="noopener">${e.license.label}</a>` : S}
                  </li>`)}
              </ul>` : S}
        </div>
        ${this.config.showSource ? b`<footer class="gbif-card__footer" part="footer">${this.renderSource("Media from the occurrence record, via GBIF.")}</footer>` : S}
      </section>
    `;
	}
}, vi = 2e6, yi = 8, bi = (e, t, n) => `${Math.abs(e)}° ${e < 0 ? n : t}`, xi = class extends Q {
	static properties = {
		basemap: { type: String },
		basemapUrl: {
			type: String,
			attribute: "basemap-url"
		},
		basemapAttribution: {
			type: String,
			attribute: "basemap-attribution"
		},
		_failed: { state: !0 }
	};
	static styles = [...Q.styles, s`
      .gbif-location__viewport {
        position: relative;
        height: var(--gbif-map-height, 20rem);
        isolation: isolate;
        background: var(--gbif-color-media-background, #e6ebf0);
      }
      .gbif-location__canvas {
        position: absolute;
        inset: 0;
      }
      .gbif-location__coordinates {
        margin: 0;
        font-variant-numeric: tabular-nums;
      }
      .gbif-location__notes {
        margin: 0;
        padding: 0.6rem 1rem;
        list-style: none;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
        background: var(--gbif-color-notice-background, #fff4d6);
        color: var(--gbif-color-notice-text, #5c3b00);
        font-size: 0.8rem;
      }
      .gbif-location__notes li + li {
        margin-top: 0.3rem;
      }
      .gbif-location__notes strong {
        font-weight: 700;
      }
      .gbif-location__place {
        margin: 0.5rem 0 0;
      }
    `];
	constructor() {
		super(), this.basemap = "light", this._failed = !1, this._map = null, this._leaflet = null, this._layers = null, this._basemapLayer = null, this._resizeObserver = null, this._initializing = !1;
	}
	onRecordChange() {
		this._failed = !1;
	}
	connectedCallback() {
		super.connectedCallback(), this.hasUpdated && this.requestUpdate();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._destroyMap();
	}
	updated(e) {
		super.updated(e), !this.ready || !this.view.point ? this._destroyMap() : (this._map && (e.has("basemap") || e.has("basemapUrl") || e.has("basemapAttribution")) && this._applyBasemap(), this._syncMap());
	}
	async _syncMap() {
		let e = this.view.point, t = this.renderRoot.querySelector(".gbif-location__canvas");
		if (e && t) {
			if (this._map && this._map.getContainer() !== t && this._destroyMap(), this._map) this._drawPoint(e);
			else if (!this._initializing) {
				this._initializing = !0;
				try {
					let [{ default: e }, { default: t }] = await dn(), n = this.renderRoot.querySelector(".gbif-location__canvas");
					if (!this.isConnected || !n || this._map || !this.view.point) return;
					pn(this.renderRoot, t), this._leaflet = e;
					let r = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
					this._map = e.map(n, {
						scrollWheelZoom: !1,
						zoomAnimation: !r,
						fadeAnimation: !r
					}), this._applyBasemap(), this._drawPoint(this.view.point), this._resizeObserver = new ResizeObserver(() => this._map?.invalidateSize()), this._resizeObserver.observe(n);
				} catch (e) {
					this._failed = !0, z(this, "gbif-error", {
						component: this.localName,
						url: e.url,
						status: e.status ?? 0,
						message: e.message
					});
				} finally {
					this._initializing = !1, !this._map && !this._failed && this.isConnected && this.view.point && this.requestUpdate();
				}
			}
		}
	}
	_applyBasemap() {
		let { url: e, attribution: t } = mn(this);
		this._basemapLayer?.remove(), this._basemapLayer = this._leaflet.tileLayer(e, {
			attribution: t,
			maxZoom: 18
		}).addTo(this._map), this._basemapLayer.bringToBack();
	}
	_drawPoint(e) {
		let t = this._leaflet;
		this._layers?.remove();
		let n = [e.lat, e.lng];
		this._layers = t.layerGroup().addTo(this._map);
		let r = e.uncertainty && e.uncertainty <= vi;
		r && t.circle(n, {
			radius: e.uncertainty,
			color: "#357a1f",
			weight: 2,
			fillColor: "#4c9c2e",
			fillOpacity: .2
		}).addTo(this._layers), t.circleMarker(n, e.approximate ? {
			radius: 9,
			color: "#8a4b00",
			weight: 2,
			dashArray: "4 3",
			fillColor: "#f7c873",
			fillOpacity: .7
		} : {
			radius: 6,
			color: "#1f2933",
			weight: 2,
			fillColor: "#fff",
			fillOpacity: 1
		}).addTo(this._layers), this._map.setMaxZoom(e.approximate ? yi : 18);
		let i = e.approximate ? yi : 14;
		r ? this._map.fitBounds(t.latLng(n).toBounds(e.uncertainty * 2), {
			maxZoom: i,
			padding: [24, 24],
			animate: !1
		}) : this._map.setView(n, e.approximate || e.uncertainty ? Math.min(6, i) : 9, { animate: !1 });
	}
	_destroyMap() {
		this._resizeObserver?.disconnect(), this._resizeObserver = null, this._map?.remove(), this._map = null, this._layers = null, this._basemapLayer = null;
	}
	_renderCoordinates(e) {
		let t = this.recordEl?.interpreted?.geodeticDatum;
		return b`<p class="gbif-location__coordinates">
      ${bi(e.lat, "N", "S")}, ${bi(e.lng, "E", "W")}${e.uncertainty ? b` · ± ${Math.round(e.uncertainty).toLocaleString()} m` : S}${typeof t == "string" && t ? b` · ${t}` : S}
    </p>`;
	}
	_renderNotes(e) {
		if (!e.length) return S;
		let t = {
			generalized: "Generalised location.",
			withheld: "Withheld.",
			flagged: "Unreliable location.",
			coarse: "Approximate location."
		};
		return b`<ul class="gbif-location__notes" part="notes" role="note" aria-label="About this location">
      ${e.map((e) => b`<li><strong>${t[e.kind] ?? "Note."}</strong> ${e.text}</li>`)}
    </ul>`;
	}
	render() {
		let e = this.renderRecordProblem();
		if (e) return e;
		if (!this.ready) return S;
		let t = this.recordEl?.interpreted, n = this.view.point, r = b`<header class="gbif-card__header" part="header"><span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || "Location")}</header>`;
		if (!n) {
			let e = [
				"locality",
				"municipality",
				"county",
				"stateProvince",
				"country"
			].map((e) => typeof t?.[e] == "string" ? t[e].trim() : "").filter(Boolean);
			return b`<section class="gbif-card" part="card">
        ${r}
        ${this._renderNotes(ui(t))}
        <div class="gbif-card__body" part="body">
          <p class="gbif-card__state">This record has no usable coordinates, so there is no map.</p>
          ${e.length ? b`<p class="gbif-location__place">Place named in the record: ${[...new Set(e)].join(", ")}</p>` : S}
        </div>
      </section>`;
		}
		if (this._failed) return b`<section class="gbif-card" part="card">
        ${r}
        ${this._renderNotes(n.notes)}
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load the map.</p>${this._renderCoordinates(n)}</div>
      </section>`;
		let i = t?.scientificName;
		return b`
      <section class="gbif-card" part="card">
        ${r}
        ${this._renderNotes(n.notes)}
        <div class="gbif-location__viewport" part="viewport">
          <div
            class="gbif-location__canvas"
            role="region"
            aria-label=${typeof i == "string" && i ? `Map of where ${i} was recorded${n.approximate ? " (approximate)" : ""}` : `Map of where it was recorded${n.approximate ? " (approximate)" : ""}`}
          ></div>
        </div>
        <footer class="gbif-card__footer" part="footer">
          ${this._renderCoordinates(n)}
          ${this.renderSource("Location from the occurrence record, via GBIF.")}
        </footer>
      </section>
    `;
	}
}, Si = (e) => {
	if (typeof e != "string") return [];
	let t = e.split(/[,|]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
	return [...new Set(t.flatMap((e) => [e, ...e.split(/\s+/)]))];
}, Ci = class extends Q {
	static properties = {
		exclude: { type: String },
		only: { type: String }
	};
	static styles = [...Q.styles, s`
      .gbif-extensions {
        display: grid;
        gap: 1rem;
      }
      .gbif-extensions__scroll {
        overflow-x: auto;
      }
      .gbif-extensions__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
      }
      .gbif-extensions__table th,
      .gbif-extensions__table td {
        padding: 0.4rem 0.6rem;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
        unicode-bidi: plaintext;
      }
      .gbif-extensions__table th {
        color: var(--gbif-color-muted, #596273);
        font-size: 0.7rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .gbif-extensions__note {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: 0.75rem;
      }
      .gbif-extensions__omitted {
        margin: 0;
        padding: 0.5rem var(--gbif-card-padding, 1rem);
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
    `];
	constructor() {
		super(), this.exclude = "Multimedia";
	}
	_chosen(e) {
		let t = Si(this.exclude), n = Si(this.only), r = (e, t) => t.includes(e.name.toLowerCase()) || t.includes(e.label.toLowerCase());
		return e.filter((e) => !r(e, t) && (!n.length || r(e, n)));
	}
	_renderCell(e) {
		return b`<td>${e.href ? b`<a href=${e.href} target="_blank" rel="noopener">${e.text}</a>` : e.text}</td>`;
	}
	render() {
		let e = this.renderRecordProblem();
		if (e) return e;
		if (!this.ready) return S;
		let t = this._chosen(this.view.extensions);
		return t.length ? b`
      <div class="gbif-extensions" part="extensions">
        ${t.map((e) => b`<section class="gbif-card" part="card" data-extension=${e.name}>
            <header class="gbif-card__header" part="header">
              <span class="gbif-card__badge">GBIF</span>
              ${this.renderTitle(t.length === 1 && this.heading ? this.heading : `${e.label} (${e.rows.length + e.omitted})`)}
            </header>
            <div class="gbif-extensions__scroll" role="region" aria-label=${e.label} tabindex="0">
              <table class="gbif-extensions__table" part="table">
                <caption class="gbif-visually-hidden">${e.label}</caption>
                <thead>
                  <tr>${e.columns.map((e) => b`<th scope="col" title=${e.term}>${e.label}</th>`)}</tr>
                </thead>
                <tbody>
                  ${e.rows.map((e) => b`<tr>${e.map((e) => this._renderCell(e))}</tr>`)}
                </tbody>
              </table>
            </div>
            ${e.omitted ? b`<p class="gbif-extensions__omitted">${e.omitted.toLocaleString()} more rows are not shown.</p>` : S}
          </section>`)}
      </div>
      ${this.config.showSource ? b`<div class="gbif-extensions__note">${this.renderSource("Extension records as published, via GBIF.")}</div>` : S}
    ` : S;
	}
}, wi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, Ti = /^10\.\d{4,9}\/\S+$/, $ = (e) => typeof e == "string" && e.trim() ? e.trim() : void 0;
function Ei(e) {
	if (!e || typeof e != "object") return null;
	let t = $(e.doi)?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
	return {
		title: $(e.title),
		doi: t && Ti.test(t) ? t : void 0,
		citation: $(e.citation?.text),
		homepage: I(e.homepage) ?? void 0
	};
}
var Di = class extends Q {
	static properties = {
		_dataset: { state: !0 },
		_datasetFailed: { state: !0 }
	};
	static styles = [...Q.styles, s`
      .gbif-citation__list {
        display: grid;
        gap: 0.5rem 0;
        margin: 0;
      }
      .gbif-citation__row {
        display: grid;
        grid-template-columns: minmax(6rem, 30%) 1fr;
        gap: 0.5rem;
      }
      .gbif-citation__term {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.78rem;
      }
      .gbif-citation__value {
        margin: 0;
        unicode-bidi: plaintext;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      @container (max-width: 18rem) {
        .gbif-citation__row {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }
      .gbif-citation__body {
        container-type: inline-size;
      }
    `];
	constructor() {
		super(), this._dataset = null, this._datasetFailed = !1, this._run = 0;
	}
	get _datasetKey() {
		let e = this.recordEl?.interpreted?.datasetKey;
		return typeof e == "string" && wi.test(e.trim()) ? e.trim() : void 0;
	}
	onRecordChange() {
		this._loadDataset();
	}
	async _loadDataset() {
		let e = ++this._run;
		this._dataset = null, this._datasetFailed = !1;
		let t = this.ready ? this._datasetKey : void 0;
		if (t) try {
			let n = await M(j(this.config.apiBase, `/v1/dataset/${t}`));
			e === this._run && (this._dataset = Ei(n));
		} catch (t) {
			if (e !== this._run) return;
			this._datasetFailed = !0, z(this, "gbif-error", {
				component: this.localName,
				url: t.url,
				status: t.status ?? 0,
				message: t.message
			});
		}
	}
	_row(e, t) {
		return b`<div class="gbif-citation__row"><dt class="gbif-citation__term">${e}</dt><dd class="gbif-citation__value">${t}</dd></div>`;
	}
	render() {
		let e = this.renderRecordProblem();
		if (e) return e;
		if (!this.ready) return S;
		let t = this.recordEl.interpreted, { siteBase: n } = this.config, r = this._datasetKey, i = typeof t.gbifID == "string" ? t.gbifID : String(t.key ?? this.recordEl.occurrenceKey), a = L(t.license), o = this._dataset?.title ?? $(t.datasetName) ?? r, s = this._dataset?.doi;
		return b`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || "Source and citation")}
        </header>
        <div class="gbif-card__body gbif-citation__body" part="body">
          <dl class="gbif-citation__list">
            ${o ? this._row("Dataset", r ? b`<a href=${`${n}/dataset/${r}`} target="_blank" rel="noopener">${o}</a>` : o) : S}
            ${this._row("Record", b`<a href=${H(n, i)} target="_blank" rel="noopener">GBIF occurrence ${i}</a>`)}
            ${a ? this._row("Licence", b`<a href=${a.url} target="_blank" rel="noopener">${a.label}</a>`) : S}
            ${$(t.rightsHolder) ? this._row("Rights holder", $(t.rightsHolder)) : S}
            ${this._dataset?.citation ? this._row("Cite the dataset", b`${this._dataset.citation}`) : s ? S : this._datasetFailed ? this._row("Cite the dataset", "The dataset's citation could not be loaded from GBIF.") : S}
            ${s ? this._row("DOI", b`<a href=${`https://doi.org/${encodeURI(s)}`} target="_blank" rel="noopener">${s}</a>`) : S}
          </dl>
        </div>
        ${this.config.showSource ? b`<footer class="gbif-card__footer" part="footer">${this.renderSource("Dataset and record details from GBIF.")}</footer>` : S}
      </section>
    `;
	}
}, Oi = "0.0.1", ki = {
	"gbif-taxon-card": Qt,
	"gbif-media-gallery": on,
	"gbif-occurrence-map": vn,
	"gbif-type-specimens": yn,
	"gbif-attribution": bn,
	"gbif-occurrence-search": vr,
	"gbif-occurrence-filters": Mr,
	"gbif-occurrence-table": Nr,
	"gbif-occurrence-gallery": Pr,
	"gbif-occurrence-record": pi,
	"gbif-occurrence-groups": gi,
	"gbif-occurrence-images": _i,
	"gbif-occurrence-location": xi,
	"gbif-occurrence-extensions": Ci,
	"gbif-occurrence-citation": Di
};
globalThis.GbifComponentsConfig && typeof globalThis.GbifComponentsConfig == "object" && xt(globalThis.GbifComponentsConfig);
for (let [e, t] of Object.entries(ki)) {
	let n = customElements.get(e);
	n ? n !== t && console.warn(`[gbif-components ${Oi}] <${e}> was already defined, so this copy was not used.`) : customElements.define(e, t);
}
globalThis.GbifComponents ??= {
	version: Oi,
	configure: xt
};
export { bn as GbifAttribution, on as GbifMediaGallery, Di as GbifOccurrenceCitation, Ci as GbifOccurrenceExtensions, Mr as GbifOccurrenceFilters, Pr as GbifOccurrenceGallery, gi as GbifOccurrenceGroups, _i as GbifOccurrenceImages, xi as GbifOccurrenceLocation, vn as GbifOccurrenceMap, pi as GbifOccurrenceRecord, vr as GbifOccurrenceSearch, Nr as GbifOccurrenceTable, Qt as GbifTaxonCard, yn as GbifTypeSpecimens, xt as configure, Oi as version };
