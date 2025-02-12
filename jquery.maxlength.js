/*!
 * jquery.maxlength.js - version 1.7.7 - 2025-01-14
 * @copyright (c) 2023-2025 scintilla0 (https://github.com/scintilla0)
 * @contributor: Squibler, ahotko
 * @license MIT License http://www.opensource.org/licenses/mit-license.html
 * @license GPL2 License http://www.gnu.org/licenses/gpl.html
 */
/**
 * This is a plugin for dynamic decimal max length auto-configuration.
 * Requires jQuery 1.7.x or higher.
 * Add the attribute [data-max-length="$minus$integral.$fractional"] to enable automatic configuration, e.g. [data-max-length="-5.2"].
 * Values of 0 for the integral limit, as well as any other unreadable parameters, will be reset to the default value of {integral: 9}.
 * Add the attribute [data-disable-autofill] to disable fractional autofill.
 * Add the attribute [data-disable-auto-comma] to disable comma autofill.
 * Add the attribute [data-disable-smart-minus] to disable smart minus configuration.
 * Add the attribute [data-disable-init-refresh] to disable the initial refresh.
 * Add the attribute [data-enable-highlight-minus="$hex"] to enable highlighting of negative values in either default red or the assigned hexadecimal color.
 * Add the attribute [data-horizontal-align="$align"] to customize text align position.
 * Add the attribute [data-sum="$selector"] or [data-product="$selector"] to enable quick sum or product calculation on
 * 	DOM elements matched by the jQuery selector, e.g. [data-sum="input.score"].
 * Add the attribute [data-difference="$minuendSelector,$subtrahendSelector"] or [data-product="$dividendSelector,$divisorSelector"] to enable quick sum or product calculation on
 * 	DOM elements matched by the jQuery selector, e.g. [data-difference="#minuend,.subtrahend"].
 * $.NumberUtil is an extended jQuery calculating utility for use.
 * Use [$.NumberUtil.setNumberFormatStandard()] to choose number format manually from [ISO, EN, ES].
 */
(function($) {
	const GLOBAL_ALTER = {DOT: '.', COMMA: ',', SPACE: ' ', VALID_CHARACTER: '-0123456789',
			DOT_KEY: [110, 190], COMMA_KEY: [188], SPACE_KEY: [32]};
	const CORE = {VALID_CHARACTER: null, DOT: null, COMMA: null, MINUS: '-', ZERO: '0', EMPTY: '',
			INTEGRAL: "integral", FRACTIONAL: "fractional", ALLOW_MINUS: "minus",
			DEFAULT_ID: '_max_length_no_', MAX_LENGTH: "data-max-length", INIT_FRESH: "data-disable-init-refresh",
			AUTOFILL: "data-disable-autofill", AUTO_COMMA: "data-disable-auto-comma", SMART_MINUS: "data-disable-smart-minus",
			HIGHLIGHT_MINUS: "data-highlight-minus", HORIZONTAL_ALIGN: "data-horizontal-align",
			SUM: "data-sum", PRODUCT: "data-product", DIFFERENCE: "data-difference", QUOTIENT: "data-quotient",
			PERCENT: "data-percent", CEIL: "data-ceil", FLOOR:"data-floor", INNER_CHANGE: "inner-change",
			HEX_REGEX: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/};
	const KEY = {DOT_KEY: null, MINUS_KEY: [109, 189], COMMON_KEY: {V: 86, X: 88},
			NUMBER_KEY: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105],
			FUNCTION_KEY: {F5: 116, ESC: 27, BACKSPACE: 8, DEL: 46, TAB: 9, ENTER: 13, ENTER_SUB: 108,
					PAGE_UP: 33, PAGE_DOWN: 34, END: 35, HOME: 36, LEFT: 37, RIGHT: 38, UP: 39, DOWN: 40},
			KEY_TYPE: {NONE: 0, MINUS: 1, DOT: 2, NUMBER: 3, FUNCTION: 4}};
	const DEFAULT_CSS = {HORIZONTAL_ALIGN: 'right', MINUS_COLOR: '#FF0000'};
	const DEFAULT_CANCEL_LENGTH = {integral: 9};
	const HORIZONTAL_ALIGN_OPTION = ['left', 'center', 'right', 'inherit'];
	const LANG_CODE = {EN: ['ar', 'en', 'iw', 'ja', 'ko', 'zh'],
			ES: ['da', 'de', 'el', 'es', 'fr', 'it', 'nl', 'pt', 'ru', 'sl', 'sv', 'tr']};
	const CommonUtil = _CommonUtil();
	globalAlter();
	$.extend({NumberUtil: _NumberUtil()});

	let maxLengthBuffer = {};
	let contentBuffer;

	let mainSelector = `[${CORE.MAX_LENGTH}]`;
	$(mainSelector).each((_, item) => {
		prepareStyle(item);
		prepareMaxLength(item);
	});
	$(document)
			.on("dragstart", mainSelector, dragstartAction)
			.on("keydown", mainSelector, keydownAction)
			.on("focus", mainSelector, focusAction)
			.on("blur", mainSelector, blurAction)
			.on("compositionstart", mainSelector, compositionstartAction)
			.on("compositionend", mainSelector, compositionendAction);
	initRefresh();

	function initRefresh(changeAction) {
		if (CommonUtil.exists(changeAction)) {
			changeAction.apply();
		}
		$(`${mainSelector}:not([${CORE.INIT_FRESH}])`).each(initFocusAndBlur);
		CommonUtil.initAndDeployListener(`[${CORE.SUM}]`, sum);
		CommonUtil.initAndDeployListener(`[${CORE.PRODUCT}]`, product);
		CommonUtil.initAndDeployListener(`[${CORE.DIFFERENCE}]`, difference);
		CommonUtil.initAndDeployListener(`[${CORE.QUOTIENT}]`, quotient);
		CommonUtil.initAndDeployListener(`[${CORE.PERCENT}]`, percent);
	}

	function dragstartAction({target: dom}) {
		if (dom.selectionStart !== dom.selectionEnd) {
			return false;
		}
	}

	function keydownAction({target: dom, keyCode: keyCode, ctrlKey: ctrlKey}) {
		let maxLength = getMaxLength(dom);
		let combineKeyResult = isCombineKeyValid(dom, maxLength, keyCode, ctrlKey);
		if (CommonUtil.exists(combineKeyResult)) {
			return combineKeyResult;
		}
		return isSingleInputValid(dom, maxLength, keyCode);
	}

	function focusAction({target: dom}) {
		let value = dom.value;
		if (dataSetAbsent(dom, CORE.AUTOFILL)) {
			value = $.NumberUtil.drainFractional(value);
		}
		if (dataSetAbsent(dom, CORE.AUTO_COMMA)) {
			value = $.NumberUtil.undressNumber(value);
		}
		if (!dataSetAbsent(dom, CORE.HIGHLIGHT_MINUS)) {
			$(dom).css(`color`, CORE.EMPTY);
		}
		setTimeout(() => {
			let originalValueFirstPart = dom.value.substring(0, dom.selectionEnd);
			dom.value = value;
			if (dataSetAbsent(dom, CORE.AUTOFILL)) {
				originalValueFirstPart = $.NumberUtil.drainFractional(originalValueFirstPart);
			}
			if (dataSetAbsent(dom, CORE.AUTO_COMMA)) {
				originalValueFirstPart = $.NumberUtil.undressNumber(originalValueFirstPart);
			}
			let cursorRepositioning = () => dom.selectionStart = dom.selectionEnd = Math.min(originalValueFirstPart.length, value.length);
			cursorRepositioning.apply(null);
			$(dom).one("select", () => {
				$(window).one("mouseup", () => {
					cursorRepositioning.apply(null);
				});
			});
		});
	}

	function blurAction({target: dom}) {
		let value = $.NumberUtil.drainIntegral(dom.value);
		if (dataSetAbsent(dom, CORE.AUTOFILL)) {
			value = $.NumberUtil.fillFractional(value, getMaxLength(dom)[CORE.FRACTIONAL]);
		}
		if (dataSetAbsent(dom, CORE.AUTO_COMMA)) {
			value = $.NumberUtil.dressNumber(value);
		}
		if (!dataSetAbsent(dom, CORE.HIGHLIGHT_MINUS)) {
			if (value.includes(CORE.MINUS)) {
				let minusColor = $(dom).attr(CORE.HIGHLIGHT_MINUS);
				if (!minusColor.startsWith('#')) {
					minusColor = '#' + minusColor;
				}
				$(dom).css(`color`, CORE.HEX_REGEX.test(minusColor) ? minusColor : DEFAULT_CSS.MINUS_COLOR);
			} else {
				$(dom).css(`color`, CORE.EMPTY);
			}
		}
		setTimeout(() => {
			dom.value = value;
		});
	}

	function initFocusAndBlur() {
		let value = $.NumberUtil.drainIntegral(CommonUtil.getValue($(this)));
		if (dataSetAbsent(this, CORE.AUTOFILL)) {
			value = $.NumberUtil.drainFractional(value);
			value = $.NumberUtil.fillFractional(value, getMaxLength(this)[CORE.FRACTIONAL]);
		}
		if (dataSetAbsent(this, CORE.AUTO_COMMA)) {
			value = $.NumberUtil.dressNumber(value);
		}
		if (!dataSetAbsent(this, CORE.HIGHLIGHT_MINUS)) {
			if (value.includes(CORE.MINUS)) {
				let minusColor = $(this).attr(CORE.HIGHLIGHT_MINUS);
				if (!minusColor.startsWith('#')) {
					minusColor = '#' + minusColor;
				}
				$(this).css(`color`, CORE.HEX_REGEX.test(minusColor) ? minusColor : DEFAULT_CSS.MINUS_COLOR);
			} else {
				$(this).css(`color`, CORE.EMPTY);
			}
		}
		CommonUtil.setValue(value, $(this));
	}

	function compositionstartAction({target: dom}) {
		contentBuffer = dom.value;
	}

	function compositionendAction({target: dom}) {
		dom.value = contentBuffer;
		contentBuffer = null;
	}

	function prepareStyle(dom) {
		let horizontalAlignProperty = $(dom).attr(CORE.HORIZONTAL_ALIGN);
		if (!HORIZONTAL_ALIGN_OPTION.includes(horizontalAlignProperty)) {
			horizontalAlignProperty = undefined;
		}
		horizontalAlignProperty = CommonUtil.exists(horizontalAlignProperty) ? horizontalAlignProperty : DEFAULT_CSS.HORIZONTAL_ALIGN;
		$(dom).css(`text-align`, horizontalAlignProperty);
	}

	function prepareMaxLength(dom) {
		let id = dom.id;
		if (CommonUtil.isBlank(id)) {
			id = CORE.DEFAULT_ID + Object.values(maxLengthBuffer).length;
			dom.id = id;
		}
		let source = $(dom).attr(CORE.MAX_LENGTH);
		if (CommonUtil.isBlank(source) || isNaN(Number(source))) {
			maxLengthBuffer[id] = DEFAULT_CANCEL_LENGTH;
			return;
		}
		if (source.startsWith(GLOBAL_ALTER.DOT) || source.endsWith(GLOBAL_ALTER.DOT) ||
				(!source.startsWith(CORE.MINUS) && source.includes(CORE.MINUS))) {
			maxLengthBuffer[id] = DEFAULT_CANCEL_LENGTH;
			return;
		}
		let absSource = source.includes(CORE.MINUS) ? source.substring(1) : source;
		let sourceSep = absSource.split(GLOBAL_ALTER.DOT);
		if (isNaN(Number(sourceSep[0])) || (absSource === CORE.ZERO && isNaN(Number(sourceSep[1])))) {
			maxLengthBuffer[id] = DEFAULT_CANCEL_LENGTH;
			return;
		}
		let maxLength = {};
		maxLength[CORE.INTEGRAL] = Number(sourceSep[0]);
		if (maxLength[CORE.INTEGRAL] === 0) {
			maxLength[CORE.INTEGRAL] = DEFAULT_CANCEL_LENGTH[CORE.INTEGRAL];
		}
		if (absSource.indexOf(GLOBAL_ALTER.DOT) !== -1 && sourceSep[1] !== CORE.ZERO) {
			maxLength[CORE.FRACTIONAL] = Number(sourceSep[1]);
		}
		if (source.startsWith(CORE.MINUS)) {
			maxLength[CORE.ALLOW_MINUS] = 1;
		}
		maxLengthBuffer[id] = maxLength;
	}

	function getMaxLength(dom) {
		let maxLength = maxLengthBuffer[dom.id];
		if (!CommonUtil.exists(maxLength)) {
			prepareStyle(dom);
			prepareMaxLength(dom);
			maxLength = maxLengthBuffer[dom.id];
		}
		return maxLength;
	}

	function isCombineKeyValid(dom, maxLength, keyCode, ctrlKey) {
		if (ctrlKey) {
			if (keyCode === KEY.COMMON_KEY.V) {
				let value = dom.value;
				let selectionEnd = dom.selectionEnd;
				setTimeout(() => {
					let afterValue = dom.value;
					let absAfterValue = afterValue.includes(CORE.MINUS) ? afterValue.substring(1) : afterValue;
					let block = false;
					if (!CommonUtil.exists(maxLength[CORE.ALLOW_MINUS]) && afterValue.includes(CORE.MINUS)) {
						block = true;
					} else if (!CommonUtil.exists(maxLength[CORE.FRACTIONAL]) && afterValue.includes(CORE.DOT)) {
						block = true;
					} else if (afterValue.replace(CORE.DOT).includes(CORE.DOT)) {
						block = true;
					} else if (afterValue.replace(CORE.MINUS).includes(CORE.MINUS)) {
						block = true;
					} else {
						let absAfterValueSep = absAfterValue.split(CORE.DOT);
						if (absAfterValueSep[0].length > maxLength[CORE.INTEGRAL]) {
							block = true;
						} else if (CommonUtil.exists(absAfterValueSep[1]) && CommonUtil.exists(maxLength[CORE.FRACTIONAL])) {
							if (absAfterValueSep[1].length > maxLength[CORE.FRACTIONAL]) {
								block = true;
							}
						}
					}
					if (block === false) {
						for (let index in afterValue) {
							if (!CORE.VALID_CHARACTER.includes(afterValue[index])) {
								block = true;
								break;
							}
						}
					}
					if (block === true) {
						dom.value = value;
						dom.selectionEnd = selectionEnd;
					}
				});
				return true;
			} else if (keyCode === KEY.COMMON_KEY.X) {
				return isSelectOperationValid(dom, maxLength);
			} else {
				return true;
			}
		}
		return null;
	}

	function isSingleInputValid(dom, maxLength, keyCode) {
		let keyType = getKeyType(keyCode);
		let value = dom.value;
		let selectionStart = dom.selectionStart, selectionEnd = dom.selectionEnd;
		let cursorPos = selectionEnd;
		let disableSmartMinus = $(dom).attr(CORE.SMART_MINUS);
		if (keyType === KEY.KEY_TYPE.NONE) {
			return false;
		}
		if (keyType === KEY.KEY_TYPE.MINUS) {
			if (!CommonUtil.exists(disableSmartMinus)) {
				if (CommonUtil.exists(maxLength[CORE.ALLOW_MINUS])) {
					let newValue = value.includes(CORE.MINUS) ? value.substring(1) : CORE.MINUS + value;
					setTimeout(() => {
						dom.value = newValue;
						let afterCursorPos = cursorPos + (value.includes(CORE.MINUS) ? -1 : 1);
						if (cursorPos === 0 && value.includes(CORE.MINUS)) {
							afterCursorPos = 0;
						}
						dom.selectionEnd = afterCursorPos;
					});
					return value !== newValue;
				}
				return false;
			} else {
				if (!CommonUtil.exists(maxLength[CORE.ALLOW_MINUS])) {
					return false;
				} else if (selectionStart === 0 && selectionEnd === value.length) {
					return true;
				} else if (value.includes(CORE.MINUS)) {
					return false;
				} else if (cursorPos !== 0) {
					return false;
				} else {
					return true;
				}
			}
		}
		if (keyType === KEY.KEY_TYPE.DOT) {
			if (!CommonUtil.exists(maxLength[CORE.FRACTIONAL])) {
				return false;
			} else if (selectionStart === 0 && selectionEnd === value.length) {
				dom.value = '0.';
				return false;
			} else if (value.includes(CORE.DOT)) {
				return false;
			} else if (value.includes(CORE.MINUS) && cursorPos === 0) {
				return false;
			} else {
				let valueSep = [value.substring(0, cursorPos), value.substring(cursorPos, value.length)];
				let valueSep0 = valueSep[0];
				valueSep[0] = valueSep[0].includes(CORE.MINUS) ? valueSep[0].substring(1) : valueSep[0];
				if ((!value.includes(CORE.MINUS) && cursorPos === 0) || (value.includes(CORE.MINUS) && (cursorPos === value.indexOf(CORE.MINUS) + 1))) {
					if (valueSep[0].length <= maxLength[CORE.INTEGRAL] && valueSep[1].length <= maxLength[CORE.FRACTIONAL]) {
						dom.value = valueSep0 + '0.' + valueSep[1];
					}
					return false;
				} else if (valueSep[0].length > maxLength[CORE.INTEGRAL] || valueSep[1].length > maxLength[CORE.FRACTIONAL]) {
					return false;
				} else {
					return true;
				}
			}
		}
		let absValue = value.includes(CORE.MINUS) ? value.substring(1) : value;
		let valueSep = absValue.split(CORE.DOT);
		let dotPos = value.indexOf(CORE.DOT);
		if (keyType === KEY.KEY_TYPE.NUMBER) {
			if (selectionStart === 0 && selectionEnd === value.length) {
				return true;
			} else if (value.includes(CORE.MINUS) && cursorPos === value.indexOf(CORE.MINUS)) {
				return false;
			} else {
				if (!value.includes(CORE.DOT)) {
					if (valueSep[0].length >= maxLength[CORE.INTEGRAL]) {
						return false;
					} else {
						return true;
					}
				} else {
					if (valueSep[0].length >= maxLength[CORE.INTEGRAL] && cursorPos <= dotPos) {
						return false;
					} else if (valueSep[1].length >= maxLength[CORE.FRACTIONAL] && cursorPos > dotPos) {
						return false;
					} else {
						return true;
					}
				}
			}
		}
		if (keyType === KEY.KEY_TYPE.FUNCTION) {
			if (selectionStart === 0 && selectionEnd === value.length) {
				return true;
			} else if (keyCode === KEY.FUNCTION_KEY.BACKSPACE) {
				if (selectionStart !== selectionEnd) {
					return isSelectOperationValid(dom, maxLength);
				} else if (value.includes(CORE.DOT) && cursorPos === dotPos + 1 && valueSep[0].length + valueSep[1].length > maxLength[CORE.INTEGRAL]) {
					return false;
				} else {
					return true;
				}
			} else if (keyCode === KEY.FUNCTION_KEY.DEL) {
				if (selectionStart !== selectionEnd) {
					return isSelectOperationValid(dom, maxLength);
				} else if (value.includes(CORE.DOT) && cursorPos === dotPos && valueSep[0].length + valueSep[1].length > maxLength[CORE.INTEGRAL]) {
					return false;
				} else {
					return true;
				}
			} else {
				return true;
			}
		}
		return false;
	}

	function isSelectOperationValid(dom, maxLength) {
		let value = dom.value;
		let selectionStart = dom.selectionStart, selectionEnd = dom.selectionEnd;
		let selectedValue = value.substring(selectionStart, selectionEnd);
		if (selectedValue.length === 0) {
			return true;
		} else if (selectedValue.includes(CORE.DOT)) {
			let absValue = value.includes(CORE.MINUS) ? value.substring(1) : value;
			let absLength = absValue.length - (selectionEnd - selectionStart);
			if (absLength > maxLength[CORE.INTEGRAL]) {
				return false;
			} else {
				return true;
			}
		} else {
			return true;
		}
	}

	function getKeyType(keyCode) {
		if (KEY.DOT_KEY.includes(keyCode)) {
			return KEY.KEY_TYPE.DOT;
		} else if (KEY.MINUS_KEY.includes(keyCode)) {
			return KEY.KEY_TYPE.MINUS;
		} else if (KEY.NUMBER_KEY.includes(keyCode)) {
			return KEY.KEY_TYPE.NUMBER;
		} else if (Object.values(KEY.FUNCTION_KEY).includes(keyCode)) {
			return KEY.KEY_TYPE.FUNCTION;
		} else {
			return KEY.KEY_TYPE.NONE;
		}
	}

	function dataSetAbsent(dom, dataSetName) {
		return !CommonUtil.exists($(dom).attr(dataSetName));
	}

	function sum(_, item) {
		let selector = $(item).attr(CORE.SUM);
		$(document).on("change " + CORE.INNER_CHANGE, selector, () => {
			setValueWithMaxlengthCap(item, $.NumberUtil.selectorSum(selector));
		});
	}

	function product(_, item) {
		let selector = $(item).attr(CORE.PRODUCT);
		$(document).on("change " + CORE.INNER_CHANGE, selector, () => {
			setValueWithMaxlengthCap(item, $.NumberUtil.selectorProductNN(selector));
		});
	}

	function difference(_, item) {
		let selectors = $(item).attr(CORE.DIFFERENCE).split(',');
		selectorCountCheck(selectors);
		$(document).on("change " + CORE.INNER_CHANGE, `${selectors[0]},${selectors[1]}`, () => {
			setValueWithMaxlengthCap(item, $.NumberUtil.blendSum($.NumberUtil.getValue(selectors[0]), false, $.NumberUtil.selectorSum(selectors[1])));
		});
	}

	function quotient(_, item) {
		let selectors = $(item).attr(CORE.QUOTIENT).split(',');
		selectorCountCheck(selectors);
		$(document).on("change " + CORE.INNER_CHANGE, `${selectors[0]},${selectors[1]}`, () => {
			setValueWithMaxlengthCap(item, $.NumberUtil.quotient($.NumberUtil.getValue(selectors[0]), $.NumberUtil.selectorProduct(selectors[1])));
		});
	}

	function percent(_, item) {
		let selectors = $(item).attr(CORE.PERCENT).split(',');
		selectorCountCheck(selectors);
		$(document).on("change " + CORE.INNER_CHANGE, `${selectors[0]},${selectors[1]}`, () => {
			setValueWithMaxlengthCap(item, $.NumberUtil.quotient($.NumberUtil.product($.NumberUtil.getValue(selectors[0]), 100),
					$.NumberUtil.selectorProductNN(selectors[1])));
		});
	}

	function selectorCountCheck(selectors) {
		if (selectors.length !== 2) {
			throw `Invalid number of selectors. Expected: 2. Received: ${selectors.length}.`;
		} else if ($(selectors[0]).length !== 1) {
			throw `There should be only 1 minuend/dividend. Received: ${$(selectors[0]).length}`;
		}
	}

	function setValueWithMaxlengthCap(item, value) {
		let maxlength = maxLengthBuffer[item.id];
		if (!CommonUtil.exists(maxlength) && dataSetAbsent($(`[id="${item.id}"]`), CORE.MAX_LENGTH)) {
			maxlength = DEFAULT_CANCEL_LENGTH;
		}
		if (!dataSetAbsent(item, CORE.CEIL)) {
			value = $.NumberUtil.ceil(value, maxlength[CORE.FRACTIONAL]);
		} else if (!dataSetAbsent(item, CORE.FLOOR)) {
			value = $.NumberUtil.floor(value, maxlength[CORE.FRACTIONAL]);
		} else {
			value = $.NumberUtil.round(value, maxlength[CORE.FRACTIONAL]);
		}
		value = value.toString();
		let hasMinus = value.includes(CORE.MINUS);
		value = value.replace(CORE.MINUS, CORE.EMPTY);
		let integralLength = value.split(CORE.DOT)[0].length;
		if (integralLength > maxlength[CORE.INTEGRAL]) {
			value = value.substring(integralLength - maxlength[CORE.INTEGRAL]);
		}
		if (hasMinus) {
			value = CORE.MINUS + value;
		}
		CommonUtil.setValue(value, item);
		$(item).each(initFocusAndBlur);
		$(item).trigger(CORE.INNER_CHANGE);
	}

	function globalAlter(fixed) {
		let option = {
			ISO: {DOT: GLOBAL_ALTER.DOT, DOT_KEY: GLOBAL_ALTER.DOT_KEY, COMMA: GLOBAL_ALTER.SPACE},
			EN: {DOT: GLOBAL_ALTER.DOT, DOT_KEY: GLOBAL_ALTER.DOT_KEY, COMMA: GLOBAL_ALTER.COMMA},
			ES: {DOT: GLOBAL_ALTER.COMMA, DOT_KEY: GLOBAL_ALTER.COMMA_KEY, COMMA: GLOBAL_ALTER.DOT}
		};
		let alter;
		if (CommonUtil.exists(fixed)) {
			alter = option[String(fixed).toLocaleUpperCase()];
		}
		if (!CommonUtil.exists(alter)) {
			let language = $(`html`).attr(`lang`);
			if (!CommonUtil.exists(language)) {
				language = navigator.language;
			}
			let containsLanguage = codeArray => codeArray.some(code => language.startsWith(code));
			if (containsLanguage(LANG_CODE.EN)) {
				alter = option.EN;
			} else if (containsLanguage(LANG_CODE.ES)) {
				alter = option.ES;
			} else {
				alter = option.ISO;
			}
		}
		KEY.DOT_KEY = alter.DOT_KEY;
		CORE.VALID_CHARACTER = alter.DOT + GLOBAL_ALTER.VALID_CHARACTER;
		CORE.DOT = alter.DOT;
		CORE.COMMA = alter.COMMA;
	}

	function _NumberUtil() {
		const RECURSION_FLAG = 'recursion_flag';

		function mix2Number(source) {
			return coreMix2Number(source);
		}

		/* private */ function coreMix2Number(source, recursionFlag) {
			let result = null;
			if (CommonUtil.exists(source)) {
				if (typeof source === "number") {
					result = source;
				} else if (typeof source === "string") {
					let trimmedSource = source.trim().replaceAll(CORE.COMMA, CORE.EMPTY);
					if (!CommonUtil.isBlank(trimmedSource)) {
						if (CORE.DOT !== GLOBAL_ALTER.DOT) {
							trimmedSource = trimmedSource.replaceAll(CORE.DOT, GLOBAL_ALTER.DOT);
						}
						trimmedSource = Number(trimmedSource);
						if (!isNaN(trimmedSource)) {
							result = trimmedSource;
						} else if (recursionFlag !== RECURSION_FLAG && !CommonUtil.isBlank(source)) {
							let newSource = null;
							if ($(source).length === 0) {
								newSource = CommonUtil.getValue(source);
							}
							result = mix2Number(newSource, RECURSION_FLAG);
						}
					}
				}
			}
			return result;
		}

		function areSameNumber(source1, source2) {
			return mix2Number(source1) === mix2Number(source2);
		}

		/* private */ function getDecimalPlace(source) {
			let decimalPlace = 0;
			let splitSource = source.toString().split(CORE.DOT);
			if (splitSource.length > 1) {
				decimalPlace = splitSource[1].length;
			}
			return decimalPlace;
		}

		/* private */ function removeDecimalPoint(source) {
			return Number(source.toString().replace(CORE.DOT, CORE.EMPTY));
		}

		/* private */ function coreSum(addend1, addend2) {
			let decimalPlace1 = getDecimalPlace(addend1);
			let decimalPlace2 = getDecimalPlace(addend2);
			let maxDecimalPlace = Math.max(decimalPlace1, decimalPlace2);
			let decimalPlaceFactor1 = Math.pow(10, maxDecimalPlace - decimalPlace1);
			let decimalPlaceFactor2 = Math.pow(10, maxDecimalPlace - decimalPlace2);
			let decimalPlaceFactor = Math.pow(10, maxDecimalPlace);
			return (removeDecimalPoint(addend1) * decimalPlaceFactor1 +
					removeDecimalPoint(addend2) * decimalPlaceFactor2) / decimalPlaceFactor;
		}

		function sum(...addends) {
			let result = 0;
			for (let addend of addends) {
				addend = mix2Number(addend);
				if (addend !== null) {
					result = coreSum(result, addend);
				}
			}
			return result;
		}

		function blendSum(...addends) {
			let result = 0;
			let positive = true;
			for (let addend of addends) {
				if (typeof addend === "boolean") {
					positive = addend;
					continue;
				}
				addend = mix2Number(addend);
				if (addend != null) {
					if (!positive) {
						addend = Number(-(addend));
					}
					result = coreSum(result, addend);
				}
			}
			return result;
		}

		function selectorSum(...addendsSelectors) {
			let result = 0;
			for (let addendsSelector of addendsSelectors) {
				$(addendsSelector).each((_, item) => {
					let addend = mix2Number(CommonUtil.getValue($(item)));
					if (addend !== null) {
						result = coreSum(result, addend);
					}
				});
			}
			return result;
		}

		/* private */ function coreProduct(factor1, factor2) {
			let decimalPlaceFactor = Math.pow(10, getDecimalPlace(factor1) + getDecimalPlace(factor2));
			return (removeDecimalPoint(factor1) * removeDecimalPoint(factor2)) / decimalPlaceFactor;
		}

		function product(...factors) {
			let result = null;
			for (let factor of factors) {
				factor = mix2Number(factor);
				if (factor !== null) {
					if (result === null) {
						result = 1;
					}
					result = coreProduct(result, factor);
				}
			}
			return result;
		}

		function productNoticeNull(...factors) {
			let result = 1;
			for (let factor of factors) {
				factor = mix2Number(factor);
				if (factor === null) {
					factor = 0;
				}
				result = coreProduct(result, factor);
			}
			return result;
		}

		function selectorProduct(...factorsSelectors) {
			let result = null;
			for (let factorsSelector of factorsSelectors) {
				$(factorsSelector).each((_, item) => {
					let factor = mix2Number(CommonUtil.getValue($(item)));
					if (factor !== null) {
						if (result === null) {
							result = 1;
						}
						result = coreProduct(result, factor);
					}
				});
			}
			return result;
		}

		function selectorProductNoticeNull(...factorsSelectors) {
			let result = 1;
			for (let factorsSelector of factorsSelectors) {
				$(factorsSelector).each((_, item) => {
					let factor = mix2Number(CommonUtil.getValue($(item)));
					if (factor === null) {
						factor = 0;
					}
					result = coreProduct(result, factor);
				});
			}
			return result;
		}

		/* private */ function coreQuotient(dividend, divisor) {
			let decimalPlaceFactor = Math.pow(10, getDecimalPlace(dividend) - getDecimalPlace(divisor));
			return (removeDecimalPoint(dividend) / removeDecimalPoint(divisor)) / decimalPlaceFactor;
		}

		function quotient(dividend, divisor) {
			dividend = mix2Number(dividend);
			divisor = mix2Number(divisor);
			if (dividend === null || divisor === null || divisor === 0) {
				return 0;
			}
			return coreQuotient(dividend, divisor);
		}

		/* private */ function coreRounding(source, decimalPlace, roundingOperation) {
			let factor = Math.pow(10, decimalPlace);
			let result = source * factor;
			result = roundingOperation.apply(null, [result]);
			return result / factor;
		}

		function round(source, decimalPlace = 0) {
			return coreRounding(mix2Number(source), decimalPlace, source => Math.round(source));
		}

		function floor(source, decimalPlace = 0) {
			return coreRounding(mix2Number(source), decimalPlace, source => Math.floor(source));
		}

		function ceil(source, decimalPlace = 0) {
			return coreRounding(mix2Number(source), decimalPlace, source => Math.ceil(source));
		}

		function dressNumber(source) {
			if (mix2Number(source) === null) {
				return source;
			}
			source = undressNumber(source);
			let sourceSep = source.split(CORE.DOT);
			let result = sourceSep[0].replace(/\.+$/g, CORE.EMPTY).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + CORE.COMMA);
			if (CommonUtil.exists(sourceSep[1])) {
				result = result + CORE.DOT + sourceSep[1];
			}
			return result;
		}

		function undressNumber(source) {
			if (mix2Number(source) === null) {
				return source;
			}
			source = source.toString().trim();
			return source.replaceAll(CORE.COMMA, CORE.EMPTY);
		}

		function drainIntegral(source) {
			if (mix2Number(source) === null) {
				return source;
			}
			source = source.toString().trim();
			let hasMinus = source.includes(CORE.MINUS);
			let resultAbs = source.replace(CORE.MINUS, CORE.EMPTY);
			while (resultAbs.startsWith(CORE.ZERO)) {
				resultAbs = resultAbs.substring(1);
			}
			if (resultAbs.length === 0 || resultAbs.startsWith(CORE.DOT)) {
				resultAbs = CORE.ZERO + resultAbs;
			}
			return (hasMinus ? CORE.MINUS : CORE.EMPTY) + resultAbs;
		}

		function drainFractional(source) {
			if (mix2Number(source) === null) {
				return source;
			}
			source = source.toString().trim();
			let sourceSep = source.split(CORE.DOT);
			let result = sourceSep[1];
			if (!CommonUtil.exists(result)) {
				result = CORE.EMPTY;
			}
			while (result.endsWith(CORE.ZERO)) {
				result = result.substring(0, result.length - 1);
			}
			return sourceSep[0] + (result.length !== 0 ? (CORE.DOT + result) : CORE.EMPTY);
		}

		function fillFractional(source, fractionalLength) {
			if (mix2Number(source) === null || !CommonUtil.exists(fractionalLength) || fractionalLength === 0) {
				return source;
			}
			source = source.toString().trim();
			let sourceSep = source.split(CORE.DOT);
			let result = sourceSep[1];
			if (!CommonUtil.exists(result)) {
				result = CORE.EMPTY;
			}
			return sourceSep[0] + CORE.DOT + result.padEnd(fractionalLength, CORE.ZERO);
		}

		function setNumberFormatStandard(standard) {
			initRefresh(() => globalAlter(standard));
		}

		return {
			sum: sum,
			blendSum: blendSum,
			selectorSum: selectorSum,
			product: product,
			productNN: productNoticeNull,
			selectorProduct: selectorProduct,
			selectorProductNN: selectorProductNoticeNull,
			quotient: quotient,
			round: round,
			floor: floor,
			ceil: ceil,
			mix2Number: mix2Number,
			dressNumber: dressNumber,
			undressNumber: undressNumber,
			drainIntegral: drainIntegral,
			drainFractional: drainFractional,
			fillFractional: fillFractional,
			areSameNumber: areSameNumber,
			setValue: CommonUtil.setValue,
			getValue: CommonUtil.getValue,
			setNumberFormatStandard: setNumberFormatStandard
		};
	}

	function _CommonUtil() {
		function exists(object) {
			return (typeof object !== "undefined" && object !== undefined && object !== null);
		}

		function isBlank(string) {
			return !(exists(string) && string.trim() !== '');
		}

		function initAndDeployListener(selector, event) {
			applyEventGroupByName(selector, event);
			deployNodeAppendListener(selector, event);
		}

		function applyEventGroupByName(selector, event) {
			let buffer = {};
			let noneNamedIndex = 0;
			$(selector).each((_, item) => {
				let key = $(item).attr(`name`);
				if (!CommonUtil.exists(key)) {
					key = noneNamedIndex ++;
				}
				if (!CommonUtil.exists(buffer[key])) {
					buffer[key] = $();
				}
				buffer[key] = buffer[key].add(item);
			});
			for (let index in buffer) {
				for (let item of buffer[index]) {
					event.apply(null, [null, item]);
				}
			}
		}

		function deployNodeAppendListener(selector, event) {
			new MutationObserver(mutationList => {
				for (let mutation of mutationList) {
					for (let node of mutation.addedNodes) {
						let targetNode = $(node).is(selector) ? $(node) : $(node).find(selector);
						applyEventGroupByName(targetNode, event);
					}
				}
			}).observe(document.body, {childList: true, subtree: true});
		}

		function setValue(value, ...selectors) {
			value = exists(value) ? value : '';
			for (let selector of selectors) {
				$(selector).each((_, item) => {
					if ($(item).is(`input:radio, input:checkbox`)) {
						$(item).prop(`checked`, false);
						$(item).filter(`[value="${value.toString()}"]`).prop(`checked`, true);
					} else if ($(item).is(`input:text, input:hidden, textarea, select`)) {
						$(item).val(value);
					} else if ($(item).is(`label, span, p`)) {
						$(item).text(value);
					} else if ($(item).is(`a`)) {
						$(item).attr(`href`, value);
					}
				});
			}
		}

		function getValue(selector) {
			if ($(selector).is(`input:radio, input:checkbox`)) {
				return $(selector).filter(`:checked`).val();
			} else if ($(selector).is(`input:text, input:hidden, textarea, select`)) {
				return $(selector).val();
			} else if ($(selector).is(`label, span`)) {
				return $(selector).text();
			} else if ($(selector).is(`a`)) {
				return $(selector).attr(`href`);
			}
		}

		return {
			exists: exists,
			isBlank: isBlank,
			initAndDeployListener: initAndDeployListener,
			setValue: setValue,
			getValue: getValue
		};
	}

}) (jQuery);
