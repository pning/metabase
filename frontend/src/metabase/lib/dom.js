
export function isObscured(element, offset) {
    // default to the center of the element
    offset = offset || {
        top: Math.round(element.offsetHeight / 2),
        left: Math.round(element.offsetWidth / 2)
    };
    let position = findPosition(element, true);
    let elem = document.elementFromPoint(position.left + offset.left, position.top + offset.top);
    return !element.contains(elem)
}

// get the position of an element on the page
export function findPosition(element, excludeScroll = false) {
	var offset = { top: 0, left: 0 };
	var scroll = { top: 0, left: 0 };
    let offsetParent = element;
    while (offsetParent) {
        // we need to check every element for scrollTop/scrollLeft
        scroll.left += element.scrollLeft || 0;
        scroll.top += element.scrollTop || 0;
        // but only the original element and offsetParents for offsetTop/offsetLeft
        if (offsetParent === element) {
    		offset.left += element.offsetLeft;
    		offset.top += element.offsetTop;
            offsetParent = element.offsetParent;
        }
        element = element.parentNode;
    }
    if (excludeScroll) {
        offset.left -= scroll.left;
        offset.top -= scroll.top;
    }
    return offset;
}

// based on http://stackoverflow.com/a/38039019/113
export function elementIsInView(element, percentX = 1, percentY = 1) {
    const tolerance = 0.01;   //needed because the rects returned by getBoundingClientRect provide the position up to 10 decimals

    const elementRect = element.getBoundingClientRect();
    const parentRects = [];

    while (element.parentElement != null) {
        parentRects.push(element.parentElement.getBoundingClientRect());
        element = element.parentElement;
    }

    return parentRects.every((parentRect) => {
        const visiblePixelX = Math.min(elementRect.right, parentRect.right) - Math.max(elementRect.left, parentRect.left);
        const visiblePixelY = Math.min(elementRect.bottom, parentRect.bottom) - Math.max(elementRect.top, parentRect.top);
        const visiblePercentageX = visiblePixelX / elementRect.width;
        const visiblePercentageY = visiblePixelY / elementRect.height;
        return visiblePercentageX + tolerance > percentX && visiblePercentageY + tolerance > percentY;
    });
}

export function getCaretPosition(element) {
    if (element.nodeName.toLowerCase() === "input" || element.nodeName.toLowerCase() === "textarea") {
        return element.selectionStart;
    } else {
        // contenteditable
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.setStart(element, 0);
        return range.toString().length;
    }
}

export function setCaretPosition(element, position) {
    if (element.setSelectionRange) {
        element.focus();
        element.setSelectionRange(position, position);
    } else if (element.createTextRange) {
        const range = element.createTextRange();
        range.collapse(true);
        range.moveEnd("character", position);
        range.moveStart("character", position);
        range.select();
    } else {
        // contenteditable
        const selection = window.getSelection();
        const pos = getTextNodeAtPosition(element, position);
        selection.removeAllRanges();
        const range = new Range();
        range.setStart(pos.node ,pos.position);
        selection.addRange(range);
    }
}

export function saveCaretPosition(context) {
    let position = getCaretPosition(context);
    return () => setCaretPosition(context, position);
}

function getTextNodeAtPosition(root, index) {
    let treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, (elem) => {
        if (index > elem.textContent.length){
            index -= elem.textContent.length;
            return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    var c = treeWalker.nextNode();
    return {
        node: c ? c : root,
        position: c ? index :  0
    };
}
