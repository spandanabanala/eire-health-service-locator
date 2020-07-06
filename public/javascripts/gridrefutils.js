/******************************************************
               Grid Reference Utilities
  Version 2.1 - Written by Mark Wilton-Jones 6/5/2010
           Updated 9/5/2010 to add dd_format
*******************************************************

Please see http://www.howtocreate.co.uk/php/ for details
Please see http://www.howtocreate.co.uk/php/gridref.php for demos and instructions
Please see http://www.howtocreate.co.uk/php/gridrefapi.php for API documentation
Please see http://www.howtocreate.co.uk/jslibs/termsOfUse.html for terms and conditions of use

Provides functions to convert between different NGR formats and latitude/longitude formats.

_______________________________________________________________________________________________*/

var gridRefUtilsToolbox;
(function () {

	//class instantiation forcing use as a singleton - state can also be stored if needed (or can change to use separate instances)
	function GridRefUtils() {}
	var onlyInstance;
	gridRefUtilsToolbox = function () {
		if( !onlyInstance ) {
			onlyInstance = new GridRefUtils();
		}
		return onlyInstance;
	};

	//character grids used by map systems
	function gridToHashmap(grid2dArray) {
		//make a hashmap of arrays giving the x,y values for grid letters
		var hashmap = {}, arRow;
		for( var i = 0; i < grid2dArray.length; i++ ) {
			arRow = grid2dArray[i];
			for( var j = 0; j < arRow.length; j++ ) {
				hashmap[arRow[j]] = [j,i];
			}
		}
		return hashmap;
	}
	var UKGridSquares = [
		//the order of grid square letters in the UK NGR system - note that in the array they start from the bottom, like grid references
		//there is no I in team
		['V','W','X','Y','Z'],
		['Q','R','S','T','U'],
		['L','M','N','O','P'],
		['F','G','H','J','K'],
		['A','B','C','D','E']
	];
	var UKGridNumbers = gridToHashmap(UKGridSquares);

	//utility functions comparable to those in PHP (some functionality is missing, as it is unused in this script)
	function round(num,precision) {
		//like Math.round but also supports precision
		if( !precision ) { return Math.round(num); }
		//for +ve precision, try to avoid floating point errors causing results with more decimal places than precision
		if( precision > 0 && num.toFixed ) { return parseFloat(num.toFixed(precision)); }
		precision = Math.pow( 10, -precision );
		var remainder = num % precision;
		var baseNumber = num - remainder;
		var halfPrecision = precision / 2;
		if( remainder >= halfPrecision ) {
			//positive numbers
			baseNumber += precision;
		} else if( -remainder > halfPrecision ) {
			//negative numbers
			baseNumber -= precision;
		}
		return baseNumber;
	}
	function strPad(str,minLength,padChr,padLeft) {
		//pad a string using padChr on left or right until it becomes at least minLength long
		str = ( str || '' ).toString();
		while( str.length < minLength ) {
			if( padLeft ) {
				str = padChr + str;
			} else {
				str += padChr;
			}
		}
		return str;
	}
	function strSplit(str) {
		//split a string into an array - regex match works, but is between 1 and 10 times slower depending on the browser
		//return str.match(/./g); //splits string into array (g flag means matches contains each overall match instead of captures)
		var strLen = str.length, outar = ['']; //empty cell - incompatible with PHP
		for( var i = 0; i < strLen; i++ ) {
			outar[i+1] = str.charAt(i);
		}
		return outar;
	}
	function prettyNumber(num) {
		if( num.toFixed ) { return num.toFixed(6); }
		if( Math.abs( num ) < 0.000001 ) { return '0'; }
		return num.toString();
	}

	//define return types
	GridRefUtils.prototype.DATA_ARRAY = 0;
	GridRefUtils.prototype.HTML = 1;
	GridRefUtils.prototype.TEXT = 2;

	//conversions between 12345,67890 and SS234789 grid reference formats
	GridRefUtils.prototype.getUKGridRef = function (origX,origY,figures,returnType,denyBadReference,isIrish) {
		if( origX && origX.constructor == Array ) {
			//passed an array, so extract the grid reference from it
			//no need to shuffle the isIrish parameter over, since it will always be at the end
			denyBadReference = returnType;
			returnType = figures;
			figures = origY;
			origY = origX[1];
			origX = origX[0];
		}
		if( typeof(figures) == 'undefined' || figures === null ) {
			figures = 4;
		} else {
			//enforce integer 1-25
			figures = Math.max( Math.min( Math.floor( figures ), 25 ) || 0, 1 );
		}
		//prepare factors used for enforcing a number of grid ref figures
		var insigFigures = figures - 5;
		//round off unwanted detail (default to 0 in case they pass a non-number)
		var x = round( origX, insigFigures ) || 0;
		var y = round( origY, insigFigures ) || 0;
		var letters, errorletters = 'OUT_OF_GRID';
		if( isIrish ) {
			//the Irish grid system uses the same letter layout as the UK system, but it only has one letter, with origin at V
			var arY = Math.floor( y / 100000 );
			var arX = Math.floor( x / 100000 );
			if( arX < 0 || arX > 4 || arY < 0 || arY > 4 ) {
				//out of grid
				if( denyBadReference ) {
					return false;
				}
				letters = errorletters;
			} else {
				letters = UKGridSquares[ arY ][ arX ];
			}
		} else {
			//origin is at SV, not VV - offset it to VV instead
			x += 1000000;
			y += 500000;
			var ar1Y = Math.floor( y / 500000 );
			var ar1X = Math.floor( x / 500000 );
			var ar2Y = Math.floor( ( y % 500000 ) / 100000 );
			var ar2X = Math.floor( ( x % 500000 ) / 100000 );
			if( ar1X < 0 || ar1X > 4 || ar1Y < 0 || ar1Y > 4 ) {
				//out of grid - don't need to test ar2Y and ar2X since they cannot be more than 4, and ar1_ will also be less than 0 if ar2_ is
				if( denyBadReference ) {
					return false;
				}
				letters = errorletters;
			} else {
				//first grid letter is for the 500km x 500km squares
				letters = UKGridSquares[ ar1Y ][ ar1X ];
				//second grid letter is for the 100km x 100km squares
				letters += UKGridSquares[ ar2Y ][ ar2X ];
			}
		}
		//floating point errors can reappear here if using numbers after the decimal point
		x %= 100000;
		y %= 100000;
		//fix negative grid coordinates
		if( x < 0 ) {
			x += 100000;
		}
		if( y < 0 ) {
			y += 100000;
		}
		if( figures <= 5 ) {
			var figureFactor = Math.pow( 10, 5 - figures );
			x = strPad( x / figureFactor, figures, '0', true );
			y = strPad( y / figureFactor, figures, '0', true );
		} else {
			//pad only the left side of the decimal point
			//use toFixed (if possible) to remove floating point errors introduced by %=
			x = x.toFixed ? x.toFixed(insigFigures) : x.toString();
			x = x.split(/\./);
			x[0] = strPad( x[0], 5, '0', true );
			x = x.join('.');
			y = y.toFixed ? y.toFixed(insigFigures) : y.toString();
			y = y.split(/\./);
			y[0] = strPad( y[0], 5, '0', true );
			y = y.join('.');
		}
		if( returnType == this.TEXT ) {
			return letters + ' ' + x + ' ' + y;
		} else if( returnType ) {
			return '<var class="grid">' + letters + '</var><var>' + x + '</var><var>' + y + '</var>';
		} else {
			return [ letters, x, y ];
		}
	};
	GridRefUtils.prototype.getUKGridNums = function (letters,x,y,returnType,denyBadReference,isIrish) {
		var halflen;
		if( letters && letters.constructor == Array ) {
			//passed an array, so extract only the grid reference from it
			//no need to shuffle the isIrish parameter over, since it will always be at the end
			denyBadReference = y;
			returnType = x;
			x = letters[1];
			y = letters[2];
			if( typeof(letters[0]) != 'string' ) { letters[0] = (letters[0]||'').toString(); }
			letters = strSplit( letters[0].toUpperCase() ); 
		} else if( typeof(x) != 'string' || typeof(y) != 'string' ) {
			//a single string 'X[Y]12345678' or 'X[Y] 1234 5678', split into parts
			//captured whitespace hack makes sure it fails reliably (UK/Irish grid refs must not match each other), while giving consistent matches length
			if( typeof(letters) != 'string' ) { letters = (letters||'').toString(); }
			denyBadReference = y;
			letters = letters.toUpperCase().match( isIrish ? /^\s*([A-HJ-Z])(\s*)([\d\.]+)\s*([\d\.]*)\s*$/ : /^\s*([A-HJ-Z])([A-HJ-Z])\s*([\d\.]+)\s*([\d\.]*)\s*$/ )
			if( !letters || ( !letters[4] && letters[3].length < 2 ) || ( !letters[4] && letters[3].indexOf('.') != -1 ) ) {
				//invalid format
				if( denyBadReference ) {
					return false;
				}
				//assume 0,0
				letters = [ '', isIrish ? 'V' : 'S', 'V', '0', '0' ];
			}
			if( !letters[4] ) {
				//a single string 'X[Y]12345678', break the numbers in half
				halflen = Math.ceil( letters[3].length / 2 );
				letters[4] = letters[3].substr( halflen );
				letters[3] = letters[3].substr( 0, halflen );
			}
			returnType = x;
			x = letters[3];
			y = letters[4];
		} else {
			letters = strSplit( ( letters || '' ).toUpperCase() );
		}
		//need 1m x 1m squares
		if( ( x + '' + y ).indexOf('.') == -1 ) {
			x = strPad( x, 5, '0' );
			y = strPad( y, 5, '0' );
		}
		x = parseFloat( x );
		y = parseFloat( y );
		if( isNaN(x) ) {
			if( denyBadReference ) {
				return false;
			}
			x = 0;
		}
		if( isNaN(y) ) {
			if( denyBadReference ) {
				return false;
			}
			y = 0;
		}
		if( isIrish ) {
			if( letters[1] && UKGridNumbers[letters[1]] ) {
				x += UKGridNumbers[letters[1]][0] * 100000;
				y += UKGridNumbers[letters[1]][1] * 100000;
			} else if( denyBadReference ) {
				return false;
			} else {
				x = y = 0;
			}
		} else {
			if( letters[1] && letters[2] && UKGridNumbers[letters[1]] && UKGridNumbers[letters[2]] ) {
				//remove offset from VV to put origin back at SV
				x += ( UKGridNumbers[letters[1]][0] * 500000 ) + ( UKGridNumbers[letters[2]][0] * 100000 ) - 1000000;
				y += ( UKGridNumbers[letters[1]][1] * 500000 ) + ( UKGridNumbers[letters[2]][1] * 100000 ) - 500000;
			} else if( denyBadReference ) {
				return false;
			} else {
				x = y = 0;
			}
		}
		if( returnType ) {
			return Math.round(x) + ',' + Math.round(y);
		} else {
			return [x,y];
		}
	};
	GridRefUtils.prototype.getIrishGridRef = function (x,y,figures,returnType,denyBadReference) {
		return this.getUKGridRef(x,y,figures,returnType,denyBadReference,true);
	};
	GridRefUtils.prototype.getIrishGridNums = function (letters,x,y,returnType,denyBadReference) {
		return this.getUKGridNums(letters,x,y,returnType,denyBadReference,true);
	};
	GridRefUtils.prototype.addGridUnits = function (x,y,returnType) {
		if( x && x.constructor == Array ) {
			//passed an array, so extract the numbers from it
			returnType = y;
			y = x[1];
			x = x[0];
		}
		y = Math.round(y) || 0;
		x = Math.round(x) || 0;
		if( returnType ) {
			return ( ( x < 0 ) ? 'W ' : 'E ' ) + Math.abs(x) + 'm, ' + ( ( y < 0 ) ? 'S ' : 'N ' ) + Math.abs(y) + 'm';
		} else {
			return [ Math.abs(x), ( x < 0 ) ? -1 : 1, Math.abs(y), ( y < 0 ) ? -1 : 1 ];
		}
	};
	GridRefUtils.prototype.parseGridNums = function (coords,returnType,denyBadCoords,strictNums) {
		var matches;
		if( coords && coords.constructor == Array ) {
			//passed an array, so extract the numbers from it
			matches = ['','',Math.round(coords[0]*coords[1])||0,'','', '', Math.round(coords[2]*coords[3])||0];
		} else {
			if( typeof(coords) != 'string' ) {
				coords = '';
			}
			//look for two floats either side of a comma (extra captures ensure array indexes remain the same as flexi's)
			var rigid = /^(\s*)(-?[\d\.]+)(\s*)(,)(\s*)(-?[\d\.]+)\s*$/;
			//look for two integers either side of a comma or space, with optional leading E/W or N/S, and trailing m
			//[EW][-]<float>[m][, ][NS][-]<float>[m]
			var flexi = /^\s*([EW]?)\s*(-?[\d\.]+)(\s*M)?(\s+|\s*,\s*)([NS]?)\s*(-?[\d\.]+)(\s*M)?\s*$/;
			var matches = coords.toUpperCase().match( strictNums ? rigid : flexi );
			if( !matches ) {
				//invalid format
				if( denyBadCoords ) {
					return false;
				}
				//assume 0,0
				matches = [ '', '', '0', '', '', '', '0' ];
			}
			matches[2] = parseFloat(matches[2]);
			matches[6] = parseFloat(matches[6]);
			if( matches[1] == 'W' ) {
				matches[2] *= -1;
			}
			if( matches[5] == 'S' ) {
				matches[6] *= -1;
			}
		}
		if( returnType ) {
			return Math.round( matches[2] ) + ',' + Math.round( matches[6] );
		} else {
			return [ matches[2], matches[6] ];
		}
	};

	//ellipsoid parameters used during grid->lat/long conversions and Helmert transformations
	var ellipsoids = {
		Airy_1830: {
			//Airy 1830 (OS)
			a: 6377563.396,
			b: 6356256.910
		},
		Airy_1830_mod: {
			//Airy 1830 modified (OSI)
			a: 6377340.189,
			b: 6356034.447
		},
		WGS84: {
			//WGS84 (GPS)
			a: 6378137,
			//b: 6356752.314140356, //old GRS80
			b: 6356752.314245
		}
	};
	var datumsets = {
		OSGB36: {
			//Airy 1830 (OS)
			a: 6377563.396,
			b: 6356256.910,
			F0: 0.9996012717,
			E0: 400000,
			N0: -100000,
			Phi0: 49,
			Lambda0: -2
		},
		Ireland_1965: {
			//Airy 1830 modified (OSI)
			a: 6377340.189,
			b: 6356034.447,
			F0: 1.000035,
			E0: 200000,
			N0: 250000,
			Phi0: 53.5,
			Lambda0: -8
		},
		IRENET95: {
			//ITM (uses WGS84) (OSI) taken from http://en.wikipedia.org/wiki/Irish_Transverse_Mercator
			a: 6378137,
			b: 6356752.314245,
			F0: 0.999820,
			E0: 600000,
			N0: 750000,
			Phi0: 53.5,
			Lambda0: 360-8
		},
		//UPS (uses WGS84), taken from http://www.epsg.org/guides/ number 7 part 2 "Coordinate Conversions and Transformations including Formulas"
		//officially defined in http://earth-info.nga.mil/GandG/publications/tm8358.2/TM8358_2.pdf
		UPS_North: {
			a: 6378137,
			b: 6356752.314245,
			F0: 0.994,
			E0: 2000000,
			N0: 2000000,
			Phi0: 90,
			Lambda0: 0
		},
		UPS_South: {
			a: 6378137,
			b: 6356752.314245,
			F0: 0.994,
			E0: 2000000,
			N0: 2000000,
			Phi0: -90,
			Lambda0: 0
		}
	};
	GridRefUtils.prototype.getEllipsoid = function (name) {
		return ellipsoids[name] || null;
	};
	GridRefUtils.prototype.createEllipsoid = function (a,b) {
		return { a: a, b: b };
	};
	GridRefUtils.prototype.getDatum = function (name) {
		return datumsets[name] || null;
	};
	GridRefUtils.prototype.createDatum = function (ellip,F0,E0,N0,Phi0,Lambda0) {
		if( !ellip || typeof(ellip.a) == 'undefined' ) {
			return null;
		}
		return { a: ellip.a, b: ellip.b, F0: F0, E0: E0, N0: N0, Phi0: Phi0, Lambda0: Lambda0 };
	};

	//conversions between 12345,67890 grid references and latitude/longitude formats
	GridRefUtils.prototype.COORDS_OS_UK = 1;
	GridRefUtils.prototype.COORDS_OSI = 2;
	GridRefUtils.prototype.COORDS_GPS_UK = 3;
	GridRefUtils.prototype.COORDS_GPS_IRISH = 4;
	GridRefUtils.prototype.COORDS_GPS_ITM = 5;
	GridRefUtils.prototype.gridToLatLong = function (E,N,ctype,returnType) {
		//horribly complex conversion according to "A guide to coordinate systems in Great Britain" Annexe C:
		//http://www.ordnancesurvey.co.uk/oswebsite/gps/information/coordinatesystemsinfo/guidecontents/
		//http://www.movable-type.co.uk/scripts/latlong-gridref.html shows an alternative script for JS, which also says what some OS variables represent
		if( E && E.constructor == Array ) {
			//passed an array, split it into parts
			returnType = ctype;
			ctype = N;
			N = E[1];
			E = E[0];
		}
		//get appropriate ellipsoid semi-major axis 'a' (metres) and semi-minor axis 'b' (metres),
		//grid scale factor on central meridian, and true origin (grid and lat-long) from Annexe A
		var ell = {};
		if( ctype && typeof(ctype) == 'object' ) {
			ell = ctype;
		} else if( ctype == this.COORDS_OS_UK || ctype == this.COORDS_GPS_UK ) {
			ell = datumsets.OSGB36;
		} else if( ctype == this.COORDS_GPS_ITM ) {
			ell = datumsets.IRENET95;
		} else if( ctype == this.COORDS_OSI || ctype == this.COORDS_GPS_IRISH ) {
			ell = datumsets.Ireland_1965;
		}
		var a = ell.a, b = ell.b, F0 = ell.F0, E0 = ell.E0, N0 = ell.N0, Phi0 = ell.Phi0, Lambda0 = ell.Lambda0;
		if( typeof(ell.F0) == 'undefined' ) {
			//invalid type
			return false;
		}
		//convert to radians
		Phi0 *= Math.PI / 180;
		//eccentricity-squared from Annexe B B1
		//e2 = ( ( a * a ) - ( b * b ) ) / ( a * a );
		var e2 = 1 - ( b * b ) / ( a * a ); //optimised
		//C1
		var n = ( a - b ) / ( a + b );
		//pre-compute values that will be re-used many times in the C3 formula
		var n2 = n * n;
		var n3 = Math.pow( n, 3 );
		var nParts1 = ( 1 + n + 1.25 * n2 + 1.25 * n3 );
		var nParts2 = ( 3 * n + 3 * n2 + 2.625 * n3 );
		var nParts3 = ( 1.875 * n2 + 1.875 * n3 );
		var nParts4 = ( 35 / 24 ) * n3;
		//iterate to find latitude (when N - N0 - M < 0.01mm)
		var Phi = Phi0;
		var M = 0;
		var loopcount = 0;
		do {
			//C6 and C7
			Phi += ( ( N - N0 - M ) / ( a * F0 ) );
			//C3
			M = b * F0 * (
				nParts1 * ( Phi - Phi0 ) -
				nParts2 * Math.sin( Phi - Phi0 ) * Math.cos( Phi + Phi0 ) +
				nParts3 * Math.sin( 2 * ( Phi - Phi0 ) ) * Math.cos( 2 * ( Phi + Phi0 ) ) -
				nParts4 * Math.sin( 3 * ( Phi - Phi0 ) ) * Math.cos( 3 * ( Phi + Phi0 ) )
			); //meridonal arc
			//due to number precision, it is possible to get infinite loops here for extreme cases (especially for invalid ellipsoid numbers)
			//in tests, upto 6 loops are needed for grid 25 times Earth circumference - if it reaches 100, assume it must be infinite, and break out
		} while( Math.abs( N - N0 - M ) >= 0.00001 && ++loopcount < 100 ); //0.00001 == 0.01 mm
		//pre-compute values that will be re-used many times in the C2 and C8 formulae
		var sinPhi = Math.sin( Phi );
		var sin2Phi = sinPhi * sinPhi;
		var tanPhi = Math.tan( Phi );
		var secPhi = 1 / Math.cos( Phi );
		var tan2Phi = tanPhi * tanPhi;
		var tan4Phi = tan2Phi * tan2Phi;
		//C2
		var Rho = a * F0 * ( 1 - e2 ) * Math.pow( 1 - e2 * sin2Phi, -1.5 ); //meridional radius of curvature
		var Nu = a * F0 / Math.sqrt( 1 - e2 * sin2Phi ); //transverse radius of curvature
		var Eta2 = Nu / Rho - 1;
		//pre-compute more values that will be re-used many times in the C8 formulae
		var Nu3 = Math.pow( Nu, 3 );
		var Nu5 = Math.pow( Nu, 5 );
		//C8 parts
		var VII = tanPhi / ( 2 * Rho * Nu );
		var VIII = ( tanPhi / ( 24 * Rho * Nu3 ) ) * ( 5 + 3 * tan2Phi + Eta2 - 9 * tan2Phi * Eta2 );
		var IX = ( tanPhi / ( 720 * Rho * Nu5 ) ) * ( 61 + 90 * tan2Phi + 45 * tan4Phi );
		var X = secPhi / Nu;
		var XI = ( secPhi / ( 6 * Nu3 ) ) * ( ( Nu / Rho ) + 2 * tan2Phi );
		var XII = ( secPhi / ( 120 * Nu5 ) ) * ( 5 + 28 * tan2Phi + 24 * tan4Phi );
		var XIIA = ( secPhi / ( 5040 * Math.pow( Nu, 7 ) ) ) * ( 61 + 662 * tan2Phi + 1320 * tan4Phi + 720 * Math.pow( tanPhi, 6 ) );
		//C8, C9
		var Edif = E - E0;
		var latitude = ( Phi - VII * Edif * Edif + VIII * Math.pow( Edif, 4 ) - IX * Math.pow( Edif, 6 ) ) * ( 180 / Math.PI );
		var longitude = Lambda0 + ( X * Edif - XI * Math.pow( Edif, 3 ) + XII * Math.pow( Edif, 5 ) - XIIA * Math.pow( Edif, 7 ) ) * ( 180 / Math.PI );
		var tmp;
		if( ctype == this.COORDS_GPS_UK ) {
			tmp = this.HelmertTransform( latitude, longitude, ellipsoids.Airy_1830, Helmerts.OSGB36_to_WGS84, ellipsoids.WGS84 );
			latitude = tmp[0];
			longitude = tmp[1];
		} else if( ctype == this.COORDS_GPS_IRISH ) {
			tmp = this.HelmertTransform( latitude, longitude, ellipsoids.Airy_1830_mod, Helmerts.Ireland65_to_WGS84, ellipsoids.WGS84 );
			latitude = tmp[0];
			longitude = tmp[1];
		}
		//force the longitude between -180 and 180
		if( longitude > 180 || longitude < -180 ) {
			longitude -= Math.floor( ( longitude + 180 ) / 360 ) * 360;
		}
		if( returnType ) {
			var deg = ( returnType == this.TEXT ) ? '\u00B0' : '&deg;'; 
			return prettyNumber(latitude) + deg + ', ' + prettyNumber(longitude) + deg;
		} else {
			return [latitude,longitude];
		}
	};
	GridRefUtils.prototype.latLongToGrid = function (latitude,longitude,ctype,returnType) {
		//horribly complex conversion according to "A guide to coordinate systems in Great Britain" Annexe C:
		//http://www.ordnancesurvey.co.uk/oswebsite/gps/information/coordinatesystemsinfo/guidecontents/
		//http://www.movable-type.co.uk/scripts/latlong-gridref.html shows an alternative script for JS, which also says what some OS variables represent
		if( latitude && latitude.constructor == Array ) {
			//passed an array, split it into parts
			returnType = ctype;
			ctype = longitude;
			longitude = latitude[1];
			latitude = latitude[0];
		}
		//convert back to local ellipsoid coordinates
		var tmp;
		if( ctype == this.COORDS_GPS_UK ) {
			tmp = this.HelmertTransform( latitude, longitude, ellipsoids.WGS84, Helmerts.WGS84_to_OSGB36, ellipsoids.Airy_1830 );
			latitude = tmp[0];
			longitude = tmp[1];
		} else if( ctype == this.COORDS_GPS_IRISH ) {
			tmp = this.HelmertTransform( latitude, longitude, ellipsoids.WGS84, Helmerts.WGS84_to_Ireland65, ellipsoids.Airy_1830_mod );
			latitude = tmp[0];
			longitude = tmp[1];
		}
		//get appropriate ellipsoid semi-major axis 'a' (metres) and semi-minor axis 'b' (metres),
		//grid scale factor on central meridian, and true origin (grid and lat-long) from Annexe A
		var ell = {};
		if( ctype && typeof(ctype) == 'object' ) {
			ell = ctype;
		} else if( ctype == this.COORDS_OS_UK || ctype == this.COORDS_GPS_UK ) {
			ell = datumsets.OSGB36;
		} else if( ctype == this.COORDS_GPS_ITM ) {
			ell = datumsets.IRENET95;
		} else if( ctype == this.COORDS_OSI || ctype == this.COORDS_GPS_IRISH ) {
			ell = datumsets.Ireland_1965;
		}
		var a = ell.a, b = ell.b, F0 = ell.F0, E0 = ell.E0, N0 = ell.N0, Phi0 = ell.Phi0, Lambda0 = ell.Lambda0;
		if( typeof(ell.F0) == 'undefined' ) {
			//invalid type
			return false;
		}
		//PHP will not allow expressions in the arrays as they are defined inline as class properties, so do the conversion to radians here
		Phi0 *= Math.PI / 180;
		var Phi = latitude * Math.PI / 180;
		var Lambda = longitude - Lambda0;
		//force Lambda between -180 and 180
		if( Lambda > 180 || Lambda < -180 ) {
			Lambda -= Math.floor( ( Lambda + 180 ) / 360 ) * 360;
		}
		Lambda *= Math.PI / 180;
		//eccentricity-squared from Annexe B B1
		//e2 = ( ( a * a ) - ( b * b ) ) / ( a * a );
		var e2 = 1 - ( b * b ) / ( a * a ); //optimised
		//C1
		var n = ( a - b ) / ( a + b );
		//pre-compute values that will be re-used many times in the C2, C3 and C4 formulae
		var sinPhi = Math.sin( Phi );
		var sin2Phi = sinPhi * sinPhi;
		var cosPhi = Math.cos( Phi );
		var cos3Phi = Math.pow( cosPhi, 3 );
		var cos5Phi = Math.pow( cosPhi, 5 );
		var tanPhi = Math.tan( Phi );
		var tan2Phi = tanPhi * tanPhi;
		var tan4Phi = tan2Phi * tan2Phi;
		var n2 = n * n;
		var n3 = Math.pow( n, 3 );
		//C2
		var Nu = a * F0 / Math.sqrt( 1 - e2 * sin2Phi ); //transverse radius of curvature
		var Rho = a * F0 * ( 1 - e2 ) * Math.pow( 1 - e2 * sin2Phi, -1.5 ); //meridional radius of curvature
		var Eta2 = Nu / Rho - 1;
		//C3, meridonal arc
		var M = b * F0 * (
			( 1 + n + 1.25 * n2 + 1.25 * n3 ) * ( Phi - Phi0 ) -
			( 3 * n + 3 * n2 + 2.625 * n3 ) * Math.sin( Phi - Phi0 ) * Math.cos( Phi + Phi0 ) +
			( 1.875 * n2 + 1.875 * n3 ) * Math.sin( 2 * ( Phi - Phi0 ) ) * Math.cos( 2 * ( Phi + Phi0 ) ) -
			( 35 / 24 ) * n3 * Math.sin( 3 * ( Phi - Phi0 ) ) * Math.cos( 3 * ( Phi + Phi0 ) )
		);
		//C4
		var I = M + N0;
		var II = ( Nu / 2 ) * sinPhi * cosPhi;
		var III = ( Nu / 24 ) * sinPhi * cos3Phi * ( 5 - tan2Phi + 9 * Eta2 );
		var IIIA = ( Nu / 720 ) * sinPhi * cos5Phi * ( 61 - 58 * tan2Phi + tan4Phi );
		var IV = Nu * cosPhi;
		var V = ( Nu / 6 ) * cos3Phi * ( ( Nu / Rho ) - tan2Phi );
		var VI = ( Nu / 120 ) * cos5Phi * ( 5 - 18 * tan2Phi + tan4Phi + 14 * Eta2 - 58 * tan2Phi * Eta2 );
		var N = I + II * Lambda * Lambda + III * Math.pow( Lambda, 4 ) + IIIA * Math.pow( Lambda, 6 );
		var E = E0 + IV * Lambda + V * Math.pow( Lambda, 3 ) + VI * Math.pow( Lambda, 5 );
		if( returnType ) {
			return Math.round(E) + ',' + Math.round(N);
		} else {
			return [E,N];
		}
	};

	//UTM - freaky format consisting of 60 transverse mercators
	GridRefUtils.prototype.utmToLatLong = function (zone,north,x,y,ellip,returnType,denyBadReference) {
		if( zone && zone.constructor == Array ) {
			//passed an array, split it into parts
			denyBadReference = y;
			returnType = x;
			ellip = north;
			y = zone[3];
			x = zone[2];
			north = zone[1];
			zone = zone[0];
		} else if( typeof(zone) == 'string' ) {
			denyBadReference = y;
			returnType = x;
			ellip = north;
			zone = zone.toUpperCase();
			var parsedZone;
			if( parsedZone = zone.match( /^\s*(0?[1-9]|[1-5][0-9]|60)\s*([C-HJ-NP-X]|NORTH|SOUTH)\s*(-?[\d\.]+)\s*[,\s]\s*(-?[\d\.]+)\s*$/ ) ) {
				//matched the shorthand 30U 1234 5678
				//[01-60]<letter><float>[, ]<float>
				//radix parameter is needed since numbers often start with a leading 0 and must not be treated as octal
				zone = parseInt( parsedZone[1], 10 );
				if( parsedZone[2].length > 1 ) {
					north = ( parsedZone[2] == 'NORTH' ) ? 1 : -1;
				} else {
					north = ( parsedZone[2] > 'M' ) ? 1 : -1;
				}
				x = parseFloat(parsedZone[3]) || 0;
				y = parseFloat(parsedZone[4]) || 0;
			} else if( parsedZone = zone.match( /^\s*(-?[\d\.]+)\s*[A-Z]*\s*[,\s]\s*(-?[\d\.]+)\s*[A-Z]*\s*[\s,]\s*ZONE\s*(0?[1-9]|[1-5][0-9]|60)\s*,?\s*([NS])/ ) ) {
				//matched the longhand 630084 mE 4833438 mN, zone 17, Northern Hemisphere
				//<float>[letters][, ]<float>[letters][, ]zone[01-60][,][NS]...
				zone = parseInt( parsedZone[3], 10 );
				north = ( parsedZone[4] == 'N' ) ? 1 : -1;
				x = parseFloat(parsedZone[1]) || 0;
				y = parseFloat(parsedZone[2]) || 0;
			} else {
				//make it reject it
				zone = 0;
			}
		}
		if( isNaN(zone) || zone < 1 || zone > 60 || isNaN(x) || isNaN(y) ) {
			if( denyBadReference ) {
				//invalid format
				return false;
			}
			if( ellip && typeof(ellip) == 'object' && typeof(ellip.F0) == 'undefined' ) {
				//invalid ellipsoid takes priority over return value
			}
			//default coordinates put it at 90,0 lat/long - use dmsToDd to get the right return_type
			return this.dmsToDd([90,0,0,1,0,0,0,0],returnType);
		}
		var ellipsoid = ( ellip && typeof(ellip) == 'object' ) ? ellip : ellipsoids.WGS84;
		ellipsoid = { a: ellipsoid.a, b: ellipsoid.b, F0: 0.9996, E0: 500000, N0: ( north < 0 ) ? 10000000 : 0, Phi0: 0, Lambda0: ( 6 * zone ) - 183 };
		return this.gridToLatLong(x,y,ellipsoid,returnType);
	};
	GridRefUtils.prototype.latLongToUtm = function (latitude,longitude,ellip,format,returnType,denyBadCoords) {
		if( latitude && latitude.constructor == Array ) {
			//passed an array, split it into parts
			denyBadCoords = returnType;
			returnType = format;
			format = ellip;
			ellip = longitude;
			longitude = latitude[1];
			latitude = latitude[0];
		}
		//force the longitude between -180 and 179.99...9
		if( longitude >= 180 || longitude < -180 ) {
			longitude -= Math.floor( ( longitude + 180 ) / 360 ) * 360;
			if( longitude == 180 ) {
				longitude = -180;
			}
		}
		var zone, zoneletter, x, y;
		if( isNaN(longitude) || isNaN(latitude) || latitude > 84 || latitude < -80 ) {
			if( denyBadCoords ) {
				//invalid format
				return false;
			}
			//default coordinates put it at ~0,0 lat/long
			if( isNaN(longitude) ) {
				longitude = 0;
			}
			if( isNaN(latitude) ) {
				latitude = 0;
			}
			if( latitude > 84 ) {
				//out of range, return appropriate polar letter, and bail out
				zoneletter = format ? 'North' : ( ( longitude < 0 ) ? 'Y' : 'Z' );
				zone = x = y = 0;
			}
			if( latitude < -80 ) {
				//out of range, return appropriate polar letter, and bail out
				zoneletter = format ? 'South' : ( ( longitude < 0 ) ? 'A' : 'B' );
				zone = x = y = 0;
			}
		}
		if( !zoneletter ) {
			//add hacks to work out if it lies in the non-standard zones
			if( latitude >= 72 && longitude >= 6 && longitude < 36 ) {
				//band X, these parts are moved around
				if( longitude < 9 ) {
					zone = 31;
				} else if( longitude < 21 ) {
					zone = 33;
				} else if( longitude < 33 ) {
					zone = 35;
				} else {
					zone = 37;
				}
			} else if( latitude >= 56 && latitude < 64 && longitude >= 3 && longitude < 6 ) {
				//band Y, this part of zone 31 is moved into zone 32
				zone = 32;
			} else {
				//yay for standards!
				zone = Math.floor( longitude / 6 ) + 31;
			}
			//get the band letter
			if( format ) {
				zoneletter = ( latitude < 0 ) ? 'South' : 'North';
			} else {
				zoneletter = Math.floor( latitude / 8 ) + 77; //67 is ASCII C
				if( zoneletter > 72 ) {
					//skip I
					zoneletter++;
				}
				if( zoneletter > 78 ) {
					//skip O
					zoneletter++;
				}
				if( zoneletter > 88 ) {
					//X is as high as it goes
					zoneletter = 88;
				}
				zoneletter = String.fromCharCode(zoneletter);
			}
			//do actual transformation
			var ellipsoid = ( ellip && typeof(ellip) == 'object' ) ? ellip : ellipsoids.WGS84;
			ellipsoid = { a: ellipsoid.a, b: ellipsoid.b, F0: 0.9996, E0: 500000, N0: ( latitude < 0 ) ? 10000000 : 0, Phi0: 0, Lambda0: ( 6 * zone ) - 183 };
			var tmpcoords = this.latLongToGrid(latitude,longitude,ellipsoid)
			if( !tmpcoords ) { return false; }
			x = tmpcoords[0];
			y = tmpcoords[1];
		}
		if( returnType ) {
			x = Math.round(x);
			y = Math.round(y);
			if( format ) {
				return x + 'mE, ' + y + 'mN, Zone ' + zone + ', ' + zoneletter + 'ern Hemisphere';
			}
			return zone + zoneletter + ' ' + x + ' ' + y;
		} else {
			return [ zone, ( latitude < 0 ) ? -1 : 1, x, y, zoneletter ];
		}
	};

	//basic polar stereographic pojections
	//formulae according to http://www.epsg.org/guides/ number 7 part 2 "Coordinate Conversions and Transformations including Formulas"
	GridRefUtils.prototype.polarToLatLong = function (easting,northing,datum,returnType) {
		if( easting && easting.constructor == Array ) {
			//passed an array, split it into parts
			returnType = datum;
			datum = northing;
			northing = easting[1];
			easting = easting[0];
		}
		if( !datum ) {
			return false;
		}
		var a = datum.a, b = datum.b, k0 = datum.F0, FE = datum.E0, FN = datum.N0, Phi0 = datum.Phi0, Lambda0 = datum.Lambda0;
		if( typeof(datum.F0) == 'undefined' || ( Phi0 != 90 && Phi0 != -90 ) ) {
			//invalid type
			return false;
		}
		//eccentricity-squared
		var e2 = 1 - ( b * b ) / ( a * a ); //optimised
		var e = Math.sqrt(e2);
		var Rho = Math.sqrt( Math.pow( easting - FE, 2 ) + Math.pow( northing - FN, 2 ) );
		var t = Rho * Math.sqrt( Math.pow( 1 + e, 1 + e ) * Math.pow( 1 - e, 1 - e ) ) / ( 2 * a * k0 );
		var x;
		if( Phi0 < 0 ) {
			//south
			x = 2 * Math.atan(t) - Math.PI / 2;
		} else {
			//north
			x = Math.PI / 2 - 2 * Math.atan(t);
		}
		//pre-compute values that will be re-used many times in the Phi formula
		var e4 = e2 * e2, e6 = e4 * e2, e8 = e4 * e4;
		var Phi = x + ( e2 / 2 + 5 * e4 / 24 + e6 / 12 + 13 * e8 / 360 ) * Math.sin( 2 * x ) +
			( 7 * e4 / 48 + 29 * e6 / 240 + 811 * e8 / 11520 ) * Math.sin( 4 * x ) +
			( 7 * e6 / 120 + 81 * e8 / 1120 ) * Math.sin( 6 * x ) +
			( 4279 * e8 / 161280 ) * Math.sin( 8 * x );
		//longitude
		var Lambda;
		//formulas here are wrong in the epsg guide; atan(foo/bar) should have been atan2(foo,bar) or it is wrong for half of the grid
		if( Phi0 < 0 ) {
			//south
			Lambda = Math.atan2( easting - FE, northing - FN );
		} else {
			//north
			Lambda = Math.atan2( easting - FE, FN - northing );
		}
		var latitude = Phi * 180 / Math.PI;
		var longitude = Lambda * 180 / Math.PI + Lambda0;
		//force the longitude between -180 and 180 (in case Lambda0 pushes it beyond the limits)
		if( longitude > 180 || longitude < -180 ) {
			longitude -= Math.floor( ( longitude + 180 ) / 360 ) * 360;
		}
		if( returnType ) {
			var deg = ( returnType == this.TEXT ) ? '\u00B0' : '&deg;'; 
			return prettyNumber(latitude) + deg + ', ' + prettyNumber(longitude) + deg;
		} else {
			return [latitude,longitude];
		}
	};
	GridRefUtils.prototype.latLongToPolar = function (latitude,longitude,datum,returnType) {
		if( latitude && latitude.constructor == Array ) {
			//passed an array, split it into parts
			returnType = datum;
			datum = longitude;
			longitude = latitude[1];
			latitude = latitude[0];
		}
		if( !datum ) {
			return false;
		}
		var a = datum.a, b = datum.b, k0 = datum.F0, FE = datum.E0, FN = datum.N0, Phi0 = datum.Phi0, Lambda0 = datum.Lambda0;
		if( typeof(datum.F0) == 'undefined' || ( Phi0 != 90 && Phi0 != -90 ) ) {
			//invalid type
			return false;
		}
		var Phi = latitude * Math.PI / 180;
		var Lambda = ( longitude - Lambda0 ) * Math.PI / 180;
		//eccentricity-squared
		var e2 = 1 - ( b * b ) / ( a * a ); //optimised
		var e = Math.sqrt(e2);
		//t
		var sinPhi = Math.sin( Phi );
		var t;
		if( Phi0 < 0 ) {
			//south
			t = Math.tan( ( Math.PI / 4 ) + ( Phi / 2 ) ) / Math.pow( ( 1 + e * sinPhi ) / ( 1 - e * sinPhi ), e / 2 );
		} else {
			//north
			t = Math.tan( ( Math.PI / 4 ) - ( Phi / 2 ) ) * Math.pow( ( 1 + e * sinPhi ) / ( 1 - e * sinPhi ), e / 2 );
		}
		//Rho
		var Rho = 2 * a * k0 * t / Math.sqrt( Math.pow( 1 + e, 1 + e ) * Math.pow( 1 - e, 1 - e ) );
		var N;
		if( Phi0 < 0 ) {
			//south
			N = FN + Rho * Math.cos( Lambda );
		} else {
			//north - origin is *down*
			N = FN - Rho * Math.cos( Lambda );
		}
		var E = FE + Rho * Math.sin( Lambda );
		if( returnType ) {
			return Math.round(E) + ',' + Math.round(N);
		} else {
			return [E,N];
		}
	};
	GridRefUtils.prototype.upsToLatLong = function (hemisphere,x,y,returnType,denyBadReference,minLength) {
		if( hemisphere && hemisphere.constructor == Array ) {
			//passed an array, so extract the grid reference from it
			minLength = returnType;
			denyBadReference = y;
			returnType = x;
			x = hemisphere[1];
			y = hemisphere[2];
			hemisphere = hemisphere[0];
		} else if( typeof(x) != 'string' || typeof(y) != 'string' ) {
			//a single string 'X 12345 67890', split into parts
			if( typeof(hemisphere) != 'string' ) { hemisphere = (hemisphere||'').toString(); }
			minLength = returnType;
			denyBadReference = y;
			returnType = x;
			//(A|B|Y|Z|N|S|north|south)[,]<float>[, ]<float>
			hemisphere = hemisphere.match( /^\s*([ABNSYZ]|NORTH|SOUTH)\s*,?\s*(-?[\d\.]+)\s*[\s,]\s*(-?[\d\.]+)\s*$/i )
			if( !hemisphere ) {
				//invalid format
				if( denyBadReference ) {
					return false;
				}
				x = y = null;
			} else {
				x = parseFloat(hemisphere[2]);
				y = parseFloat(hemisphere[3]);
				hemisphere = hemisphere[1];
			}
		}
		if( typeof(hemisphere) == 'string' ) {
			hemisphere = hemisphere.toUpperCase();
		}
		if( isNaN(x) || isNaN(y) || ( isNaN(hemisphere) && ( typeof(hemisphere) != 'string' || !hemisphere.match(/^([ABNSYZ]|NORTH|SOUTH)$/) ) ) || minLength && ( x < 800000 || y < 800000 ) ) {
			if( denyBadReference ) {
				return false;
			}
			//default coordinates put it at 0,0 lat/long - use dmsToDd to get the right return_type
			return this.dmsToDd([0,0,0,0,0,0,0,0],returnType);
		}
		if( typeof(hemisphere) != 'string' ) {
			hemisphere = ( hemisphere < 0 ) ? 'S' : 'N';
		}
		if( hemisphere == 'N' || hemisphere == 'NORTH' || hemisphere == 'Y' || hemisphere == 'Z' ) {
			hemisphere = datumsets.UPS_North;
		} else {
			hemisphere = datumsets.UPS_South;
		}
		return this.polarToLatLong(x,y,hemisphere,returnType);
	};
	GridRefUtils.prototype.latLongToUps = function (latitude,longitude,format,returnType,denyBadCoords) {
		if( latitude && latitude.constructor == Array ) {
			//passed an array, split it into parts
			denyBadCoords = returnType;
			returnType = format;
			format = longitude;
			longitude = latitude[1];
			latitude = latitude[0];
		}
		//force the longitude between -179.99...9 and 180
		if( longitude > 180 || longitude <= -180 ) {
			longitude -= Math.floor( ( longitude + 180 ) / 360 ) * 360;
			if( longitude == -180 ) {
				longitude = 180;
			}
		}
		var tmp, letter;
		if( isNaN(longitude) || isNaN(latitude) || latitude > 90 || latitude < -90 || ( latitude < 83.5 && latitude > -79.5 ) ) {
			if( denyBadCoords ) {
				//invalid format
				return false;
			}
			//default coordinates put it as 90,0 in OUT_OF_GRID zone
			tmp = [ 2000000, 2000000 ];
			letter = 'OUT_OF_GRID';
		} else {
			tmp = this.latLongToPolar( latitude, longitude, ( latitude < 0 ) ? datumsets.UPS_South : datumsets.UPS_North );
			if( latitude < 0 ) {
				if( format ) {
					letter = 'S';
				} else if( longitude < 0 ) {
					letter = 'A';
				} else {
					letter = 'B';
				}
			} else {
				if( format ) {
					letter = 'N';
				} else if( longitude < 0 ) {
					letter = 'Y';
				} else {
					letter = 'Z';
				}
			}
		}
		if( returnType ) {
			tmp[0] = Math.round(tmp[0]);
			tmp[1] = Math.round(tmp[1]);
			return letter+' '+tmp[0]+' '+tmp[1];
		} else {
			return [ ( latitude < 0 ) ? -1 : 1, tmp[0], tmp[1], letter ];
		}
	};

	//Helmert transform parameters used during Helmert transformations
	//OSGB<->WGS84 parameters taken from "6.6 Approximate WGS84 to OSGB36/ODN transformation"
	//http://www.ordnancesurvey.co.uk/oswebsite/gps/information/coordinatesystemsinfo/guidecontents/guide6.html
	var Helmerts = {
		WGS84_to_OSGB36: {
			tx: -446.448,
			ty: 125.157,
			tz: -542.060,
			s: 20.4894,
			rx: -0.1502,
			ry: -0.2470,
			rz: -0.8421
		},
		OSGB36_to_WGS84: {
			tx: 446.448,
			ty: -125.157,
			tz: 542.060,
			s: -20.4894,
			rx: 0.1502,
			ry: 0.2470,
			rz: 0.8421
		},
		//Ireland65<->WGS84 parameters taken from http://en.wikipedia.org/wiki/Helmert_transformation
		WGS84_to_Ireland65: {
			tx: -482.53,
			ty: 130.596,
			tz: -564.557,
			s: -8.15,
			rx: 1.042,
			ry: 0.214,
			rz: 0.631
		},
		Ireland65_to_WGS84: {
			tx: 482.53,
			ty: -130.596,
			tz: 564.557,
			s: 8.15,
			rx: -1.042,
			ry: -0.214,
			rz: -0.631
		}
	};
	GridRefUtils.prototype.getTransformation = function (name) {
		return Helmerts[name] || null;
	};
	GridRefUtils.prototype.createTransformation = function (tx,ty,tz,s,rx,ry,rz) {
		return { tx: tx, ty: ty, tz: tz, s: s, rx: rx, ry: ry, rz: rz };
	};
	GridRefUtils.prototype.HelmertTransform = function (N,E,H,efrom,via,eto,returnType) {
		//conversion according to formulae listed on http://www.movable-type.co.uk/scripts/latlong-convert-coords.html
		//parts taken from http://www.ordnancesurvey.co.uk/oswebsite/gps/information/coordinatesystemsinfo/guidecontents/
		var hasHeight = true;
		if( N && N.constructor == Array ) {
			//passed an array, split it into parts
			returnType = via;
			eto = efrom;
			via = H;
			efrom = E;
			E = N[1];
			N = N[0];
			hasHeight = typeof(N[2]) != 'undefined';
			H = hasHeight ? N[2] : 0;
		} else if( H && typeof(H) == 'object' ) {
			//no height, assume 0
			hasHeight = false;
			returnType = eto;
			eto = via;
			via = efrom;
			efrom = H;
			H = 0;
		}
		//don't throw if parameters are null or undefined
		if( !efrom ) { efrom = {}; }
		if( !via ) { efrom = {}; }
		if( !eto ) { eto = {}; }
		//work in radians
		N *= Math.PI / 180;
		E *= Math.PI / 180;
		//convert polar coords to cartesian
		//eccentricity-squared of source ellipsoid from Annexe B B1
		var e2 = 1 - ( efrom.b * efrom.b ) / ( efrom.a * efrom.a );
		var sinPhi = Math.sin( N );
		var cosPhi = Math.cos( N );
		//transverse radius of curvature
		var Nu = efrom.a / Math.sqrt( 1 - e2 * sinPhi * sinPhi );
		var x = ( Nu + H ) * cosPhi * Math.cos( E );
		var y = ( Nu + H ) * cosPhi * Math.sin( E );
		var z = ( ( 1 - e2 ) * Nu + H ) * sinPhi;
		//transform parameters
		var tx = via.tx, ty = via.ty, tz = via.tz, s = via.s, rx = via.rx, ry = via.ry, rz = via.rz;
		//convert seconds to radians
		rx *= Math.PI / 648000;
		ry *= Math.PI / 648000;
		rz *= Math.PI / 648000;
		//convert ppm to pp_one, and add one to avoid recalculating
		s = s / 1000000 + 1;
		//apply Helmert transform (algorithm notes incorrectly show rx instead of rz in x1 line)
		var x1 = tx + s * x - rz * y + ry * z;
		var y1 = ty + rz * x + s * y - rx * z;
		var z1 = tz - ry * x + rx * y + s * z;
		//convert cartesian coords back to polar
		//eccentricity-squared of destination ellipsoid from Annexe B B1
		e2 = 1 - ( eto.b * eto.b ) / ( eto.a * eto.a );
		var p = Math.sqrt( x1 * x1 + y1 * y1 );
		var Phi = Math.atan2( z1, p * ( 1 - e2 ) );
		var Phi1 = 2 * Math.PI;
		var accuracy = 0.000001 / eto.a; //0.01 mm accuracy, though the OS transform itself only has 4-5 metres
		var loopcount = 0;
		//due to number precision, it is possible to get infinite loops here for extreme cases (especially for invalid parameters)
		//in tests, upto 4 loops are needed - if it reaches 100, assume it must be infinite, and break out
		while( Math.abs( Phi - Phi1 ) > accuracy && loopcount++ < 100 ) {
			sinPhi = Math.sin( Phi );
			Nu = eto.a / Math.sqrt( 1 - e2 * sinPhi * sinPhi );
			Phi1 = Phi;
			Phi = Math.atan2( z1 + e2 * Nu * sinPhi, p );
		}
		var Lambda = Math.atan2( y1, x1 );
		H = ( p / Math.cos( Phi ) ) - Nu;
		//done converting - return in degrees
		var latitude = Phi * ( 180 / Math.PI );
		var longitude = Lambda * ( 180 / Math.PI );
		if( returnType ) {
			var deg = ( returnType == this.TEXT ) ? '\u00B0' : '&deg;'; 
			return prettyNumber(latitude) + deg + ', ' + prettyNumber(longitude) + deg + ( hasHeight ? ( ', ' + prettyNumber(H) ) : '' );
		} else {
			var temparray = [latitude,longitude];
			if( hasHeight ) { temparray[2] = H; }
			return temparray;
		}
	};

	//conversions between different latitude/longitude formats
	GridRefUtils.prototype.ddToDms = function (N,E,onlyDm,returnType) {
		//decimal degrees (49.5,-123.5) to degrees-minutes-seconds (49°30'0"N, 123°30'0"W)
		if( N && N.constructor == Array ) {
			//passed an array, split it into parts
			returnType = onlyDm;
			onlyDm = E;
			E = N[1];
			N = N[0];
		}
		var NAbs = Math.abs(N);
		var EAbs = Math.abs(E);
		var degN = Math.floor(NAbs);
		var degE = Math.floor(EAbs);
		var minN, secN, minE, secE;
		if( onlyDm ) {
			minN = 60 * ( NAbs - degN );
			secN = 0;
			minE = 60 * ( EAbs - degE );
			secE = 0;
		} else {
			//the approach used here is careful to respond consistently to floating point errors for all of degrees/minutes/seconds
			//errors should not cause one to be increased while another is decreased (which could cause eg. 5 minutes 60 seconds)
			minN = 60 * NAbs;
			secN = ( minN - Math.floor( minN ) ) * 60;
			minN = Math.floor( minN % 60 );
			minE = 60 * EAbs;
			secE = ( minE - Math.floor( minE ) ) * 60;
			minE = Math.floor( minE % 60 );
		}
		if( returnType ) {
			var deg = '&deg;', quot = '&quot;';
			if( returnType == this.TEXT ) {
				deg = '\u00B0';
				quot = '"';
			}
			if( onlyDm ) {
				//careful not to round up to 60 minutes when displaying
				return degN + deg + prettyNumber( ( minN >= 59.9999995 ) ? 59.999999 : minN ) + "'" + ( ( N < 0 ) ? 'S' : 'N' ) + ', ' +
					degE + deg + prettyNumber( ( minE >= 59.9999995 ) ? 59.999999 : minE ) + "'" + ( ( E < 0 ) ? 'W' : 'E' );
			} else {
				//careful not to round up to 60 seconds when displaying
				return degN + deg + minN + "'" + prettyNumber( ( secN >= 59.9999995 ) ? 59.999999 : secN ) + quot + ( ( N < 0 ) ? 'S' : 'N' ) + ', ' +
					degE + deg + minE + "'" + prettyNumber( ( secE >= 59.9999995 ) ? 59.999999 : secE ) + quot + ( ( E < 0 ) ? 'W' : 'E' );
			}
		} else {
			return [ degN, minN, secN, ( N < 0 ) ? -1 : 1, degE, minE, secE, ( E < 0 ) ? -1 : 1 ];
		}
	};
	GridRefUtils.prototype.ddFormat = function(N,E,noUnits,returnType) {
		//different formats of decimal degrees (49.5,-123.5)
		if( N && N.constructor == Array ) {
			//passed an array, split it into parts
			returnType = noUnits;
			noUnits = E;
			E = N[1];
			N = N[0];
		}
		var latMul, longMul;
		if( noUnits ) {
			latMul = longMul = returnType ? '' : 1;
		} else {
			latMul = returnType ? ( ( N < 0 ) ? 'S' : 'N' ) : ( ( N < 0 ) ? -1 : 1 );
			longMul = returnType ? ( ( E < 0 ) ? 'W' : 'E' ) : ( ( E < 0 ) ? -1 : 1 );
			N = Math.abs(N);
			E = Math.abs(E);
		}
		if( returnType ) {
			var deg = ( returnType == this.TEXT ) ? '\u00B0' : '&deg;';
			return prettyNumber( N ) + deg + latMul + ', ' + prettyNumber( E ) + deg + longMul;
		}
		return [ N, 0, 0, latMul, E, 0, 0, longMul ];
	};
	GridRefUtils.prototype.dmsToDd = function (dms,returnType,denyBadCoords) {
		//degrees-minutes-seconds (49°30'0"N, 123°30'0"W) to decimal degrees (49.5,-123.5)
		var latlong;
		if( dms.constructor == Array ) {
			//passed an array of values, which can be unshifted once to get the right positions
			latlong = ['','',dms[0],'',dms[1],'',dms[2],'',dms[3],'',dms[4],'',dms[5],'',dms[6],dms[7]];
		} else {
			//simple regex ;) ... matches upto 3 sets of number[non-number] per northing/easting (allows for DMS, DM or D)
			//note that this cannot accept HTML strings from ddToDms as it will not match &quot;
			//[-]<float><separator>[<float><separator>[<float><separator>]]([NS][,]|,)[-]<float><separator>[<float><separator>[<float><separator>]][EW]
			//Captures -, <float>, <float>, <float>, [NS], -, <float>, <float>, <float>, [EW]
			latlong = dms ? dms.toUpperCase().match( /^\s*(-?)([\d\.]+)\D\s*(([\d\.]+)\D\s*(([\d\.]+)\D\s*)?)?(([NS])\s*,?|,)\s*(-?)([\d\.]+)\D\s*(([\d\.]+)\D\s*(([\d\.]+)\D\s*)?)?([EW]?)\s*$/ ) : null;
			if( !latlong ) {
				//invalid format
				if( denyBadCoords ) {
					return false;
				}
				//assume 0,0
				latlong = ['','','0','','0','','0','','N','','0','','0','','0','E'];
			}
			//JS does not implicitly cast string to number when adding; operator concatenates instead
			latlong[2] = parseFloat(latlong[2]);
			latlong[4] = parseFloat(latlong[4]);
			latlong[6] = parseFloat(latlong[6]);
			latlong[10] = parseFloat(latlong[10]);
			latlong[12] = parseFloat(latlong[12]);
			latlong[14] = parseFloat(latlong[14]);
		}
		if( !latlong[4] ) { latlong[4] = 0; }
		if( !latlong[6] ) { latlong[6] = 0; }
		if( !latlong[12] ) { latlong[12] = 0; }
		if( !latlong[14] ) { latlong[14] = 0; }
		var lat = latlong[2] + latlong[4] / 60 + latlong[6] / 3600;
		if( latlong[1] ) { lat *= -1; }
		if( latlong[8] == 'S' || latlong[8] == -1 ) { lat *= -1; }
		var longt = latlong[10] + latlong[12] / 60 + latlong[14] / 3600;
		if( latlong[9] ) { longt *= -1; }
		if( latlong[15] == 'W' || latlong[15] == -1 ) { longt *= -1; }
		if( returnType ) {
			var deg = ( returnType == this.TEXT ) ? '\u00B0' : '&deg;'; 
			return prettyNumber(lat) + deg + ', ' + prettyNumber(longt) + deg;
		} else {
			return [ lat, longt ];
		}
	};

})();