import {TEXT} from "./main.js";
import {logo} from "./imageData.js";

"use strict";

/**
* Adds text (which can be formatted using options) to the PDF.
*
* @param {String} txt Text to be added to the document.
* @param {Object} options E.g.: {align: "center", size: 30}.
* @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page.
* @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page.
*/
jsPDF.API.myText = function(txt, options, x, y) {
	options = options ||{};
	// Param x will be ignored if desired text alignment is "center".
	if(options.size) {
		this.setFontSize(options.size);
	}
	if(options.align == "center") {
		let fontSize = this.internal.getFontSize();
		let pageWidth = this.internal.pageSize.getWidth();
		let txtWidth = this.getStringUnitWidth(txt) * fontSize / this.internal.scaleFactor;
		// Calculate text's x coordinate
		x = (pageWidth - txtWidth) / 2;
	}
	this.text(txt, x, y);
}

/**
* Adds a cover page to the PDF.
*
* @param {String} title Text to be added to the cover page as title.
* @param {Object} subtitle Text to be added to the cover page as subtitle.
*/
jsPDF.API.addCoverPage = function(title, subtitle) {
	let currentDate = new Date().toLocaleDateString()
	
	this.addPage("a4", "portrait");
	this.addImage(logo, "JPEG", 72, 25, 65, 28);
	this.myText(title, {align: "center", size: 45}, 0, 120);	
	this.myText(subtitle, {align: "center", size: 30}, 0, 160);
	this.myText(currentDate, {align: "center", size: 18}, 0, 250);		
}

/**
* Adds a page (sign) to the PDF.
*
* @param {String} title Text to be added as title to the page.
* @param {String} subtitle Text to be added as subtitle to the page.
* @param {Boolean} printText Shall text be added to the page?
* @param {Object} image Image to be added to the page.
* @param {Boolean} printCircle Shall a colored circle be printed on the back side?
* @param {Object} circleColor Color of the circle, e.g {r: 255, g: 0, b: 0}
*/
jsPDF.API.addSign = function(title, subtitle, printText, image = null, printCircle = false, circleColor = null) {
	// Convert row to string as doc.myText expects a string
	if(Number.isInteger(title)) {
		title = "" + title;
	}
	if(Number.isInteger(subtitle)) {
		subtitle = "" + subtitle;
	}
	let fontsize = determineFontSize(title.length);

	this.addPage("a4", "landscape");
	
	if(printText == false && !hasImage(image)) {
		// No text, no image
	} else if(printText == false && hasImage(image)) {
		// Image only
		this.addImage(image.imageData, "PNG", 90, 40, 120, 120, "", "FAST");
	} else if(hasImage(image)){
		// Title + Subtitle + Image
		this.addImage(image.imageData, "PNG", 90, 75, 120, 120, "", "FAST");
		this.myText(title, {align: "center", size: fontsize.title}, 0, 40);	
		this.myText(subtitle, {align: "center", size: fontsize.subtitle}, 0, 65);		
	} else if(!hasImage(image) && subtitle === "" && title.length <= 3) {
		// Title, 1 or 2 characters only
		this.myText(title, {align: "center", size: fontsize.title}, 0, 150);			
	} else {
		// Title + Subtitle 
		this.myText(title, {align: "center", size: fontsize.title}, 0, 95);	
		this.myText(subtitle, {align: "center", size: fontsize.subtitle}, 0, 135);		
	}
	this.addImage(logo, "JPEG", 5, 176, 65, 28);
		
	if(printCircle == true) {	
		this.setFillColor(circleColor.r, circleColor.g, circleColor.b);
		this.circle(285, 196, 2.5, "F");
	}
};

/**
* Adds an index table to the PDF.
*
* @param {Object} columnTitles E.g.: ["Kategorie", "Unterkategorie", "Anzahl"];
* @param {Object} tableData Data to be added to the table, e.g.: [["A", "B", 2]]
* @param {String} pageTitle Title to be shown above the table.
* @param {Boolean} showSubcategoryDivider Shall a divider be shown between different subcategories?
* @param {Object} circleColor Color of the circle, e.g {r: 255, g: 0, b: 0}
*/
jsPDF.API.addIndexTable = function(columnTitles, tableData, pageTitle, showSubcategoryDivider, circleColor) {
	// Add a title row if the value of the first column differs in the current and the previous row
	let previousRow = {};
	let body = [];
	for(let row of tableData) {
		if(showSubcategoryDivider && row[0] != previousRow[0]) {
			body.push([{content: row[0], colSpan: columnTitles.length, styles: {valign: "middle", halign: "center", fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: "bold"}}]);	
		}
		body.push(row);
		previousRow = row;
	}
	
	this.addPage("a4", "portrait");	
	this.autoTable({
		head: [columnTitles], 
		body: body,
		styles: {overflow: "ellipsize"},
		didDrawPage: (data) => {
			// header
			this.setFontSize(20);
			this.setTextColor(40);
			this.text(pageTitle, data.settings.margin.left, 22);			
			this.addImage(logo, "JPEG", 158, 8, 41, 18);
			// footer
			this.setFontSize(10);
			let pageHeight = this.internal.pageSize.height || this.internal.pageSize.getHeight();
			this.text(TEXT.page + " " + data.pageCount, data.settings.margin.left, pageHeight - 8);
			
			if(circleColor != null) {
				this.setFillColor(circleColor.r, circleColor.g, circleColor.b);
				this.circle(193, pageHeight - 8, 2.5, "F");
			}			
		},
		margin: {top: 30},
	});
};

/* Determine fonsize depending on text length */
let determineFontSize = (textLength) => {
	let fontsize = {title: 75, subtitle: 50};
	
	if(textLength >= 45) {
		fontsize.title = 30;
		fontsize.subtitle = 25;
	}	
	else if(textLength >= 39) {
		fontsize.title = 35;
		fontsize.subtitle = 30;
	}
	else if(textLength >= 34) {
		fontsize.title = 45;
		fontsize.subtitle = 35;		
	}	
	else if(textLength >= 32) {
		fontsize.title = 50;
		fontsize.subtitle = 40;				
	}	
	else if(textLength >= 28) {
		fontsize.title = 55;
		fontsize.subtitle = 40;		
	}
	else if(textLength >= 20) {
		fontsize.title = 60;
		fontsize.subtitle = 40;				
	}
	else if(textLength >= 15) {
		fontsize.title = 75;
		fontsize.subtitle = 50;				
	} 	 
	else if(textLength >= 2) {
		fontsize.title = 90;
		fontsize.subtitle = 65;				
	} else {
		fontsize.title = 400;
		fontsize.subtitle = 120;				
	}
	
	return fontsize;
};

let hasImage = (image) => {
	return image != null && (image.type === "image/png" || image.type === "image/jpeg");
};
