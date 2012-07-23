/////////////////////////////////////////
// TidyPencil.js                       //
// A script for Scriptographer         //
/////////////////////////////////////////


/*////////////// NOTES //////////////////

+ Tollerance for straight bits?
+ Set controle points to smooth for editing?
+ First (second) controlepoint handle-in needs to be set properly
+ Draw close contours tickbox

*////////////////////////////////////////



//-------------GLOBAL VARIABLES
tool.minDistance = 10;
tool.maxDistance = 250;
var penWidth = 10;

//standard paths
var mousePath;
var penPath;
var tempPath;

//-------------(END GLOBAL VARIABLES)

//-------------USER INTERFACE
var components = { 
    minDistance: {
        type: 'number', 
        label: 'Min Segment length', 
        units: 'point',
        value: tool.minDistance,
        onChange: function(value) {
            tool.minDistance = value;
        }
    },
    maxDistance: {
        type: 'number', 
        label: 'Max Segment length', 
        units: 'point',
        value: tool.maxDistance,
        onChange: function(value) {
            tool.maxDistance = value;
        }
    },
    penWidth: {
        type: 'number', 
        label: 'Pen width', 
        units: 'point',
        value: penWidth,
        onChange: function(value) {
            penWidth = value;
        }
    }
};

var palette = new Palette('Tidy Brush', components);
//-------------(END USER INTERFACE)

//------------- MOUSE EVENTS
function onMouseDown(event) {
    mousePath = new Path();
    mousePath.selected = false;
    mousePath.add(event.point);
}

function onMouseDrag(event) {
    mousePath.add(event.point);
}

function onMouseUp(event) {
    mousePath.add(event.point); //endpoint
    //draw closed contour if enpoint is close to startpoint?
    mousePath.strokeColor = '050505';
    tempPath = mousePath.clone();
    removeStackedPoints(tempPath);
    simplefy(tempPath);
    tempPath.remove();
    mousePath.remove();
}
//-------------(END MOUSE EVENTS)

//------------- FUNCTIONS
function log(x){
    console.log(x);
}
function drawline(start,end){
    var line = new Path();
    line.strokeColor = '#32FF00';
    line.add(start);
    line.add(end);
}

function simplefy(thisPath){
    //global variables
    var cp=new Array(),                     //controle points
        pp=new Array(),                     //path points
        dp=new Array(),                     //deleted points
        lkp = thisPath.segments.last.point, //last keep point
        len = thisPath.segments.length,
        dirX = 1,                           //direction X
        dirY = 1;                           //direction Y

    if (len > 2){
        for(var i = len-1; i>=0; i--){
            //reference points
            var ts = thisPath.segments[i];  //this segment
            var thisX = ts.point.x,
                thisY = ts.point.y;
            if(ts.point != thisPath.segments.first.point){
                var ps = ts.previous;       // previous segment
                var prevX = ps.point.x,
                    prevY = ps.point.y;
                //difference between this point and the next
                diffX = thisX-prevX;
                diffY = thisY-prevY;
                //set the initial direction
                if(i == len-1){
                    dirX = switchDirection(diffX,dirX);
                    dirY = switchDirection(diffY,dirY);
                }
            } else {
                var ns = ts.next;           //next segment
                var nextX = ns.point.x,
                    nextY = ns.point.y;
                diffX = nextX-thisX;
                diffY = nextY-thisY;
            }
            //compare points
            if( ( (Math.abs(diffX) < 1 || Math.abs(diffY) < 1) || (samesign(diffX,dirX) && samesign(diffY,dirY)) ) && ts.point != thisPath.segments.last.point && ts.point != thisPath.segments.first.point ){
                //delete
                var pointObj = {x:ts.point.x,y:ts.point.y,l:0};
                dp.push(pointObj);
                ts.remove();
            } else {
                //keep
                var pA = new Point(lkp.x, thisY);
                var pB = new Point(thisX, lkp.y);
                //drawline(pA,pB); //temp visual

                //calculate distance in object
                for(var j = dp.length-1; j>=0; j--){
                    dp[j].l = dotLineLength(dp[j].x, dp[j].y, pA.x, pA.y, pB.x, pB.y, false);
                }

                if(dp.length > 0){
                    //get closest point to line
                    var smallest = dp[0];
                    for(var j = dp.length-1; j>=0; j--){
                       if (dp[j].l<smallest.l) {
                            smallest = dp[j];
                        }
                    }
                    //var myCircle = new Path.Circle(new Point(smallest.x, smallest.y), 3); //temp visual
                    
                    //save this point as controle point
                    var pointObj = {x:smallest.x,y:smallest.y,pos:i,inx:0,iny:0,outx:0,outy:0};
                    cp.push(pointObj);
                }
                //save this point to path
                var pointObj = {x:ts.point.x,y:ts.point.y,pos:i,inx:0,iny:0,outx:0,outy:0};
                    pp.push(pointObj);

                //switch direction
                dirX = switchDirection(diffX,dirX);
                dirY = switchDirection(diffY,dirY);

                //update variables
                lkp = ts.point;
                dp = [];
            }
        }   
    }
    thisPath.remove();
    calcSimplePath(cp,pp);
}

function removeStackedPoints(thisPath){
    var len = thisPath.segments.length;
    var threshold = 1;
    for(var i = len-1; i>=0; i--){
        //this segment
        var ts = thisPath.segments[i];
        if(ts.point != thisPath.segments.first.point){
            var ps = ts.previous;       // previous segment
            //compare points
            var difference = ps.point-ts.point;
            if( difference.x <= threshold && difference.y <= threshold && difference.x >= -threshold && difference.y >= -threshold ){
                ps.remove();
                return removeStackedPoints(thisPath);
            }
        }
    }
    return thisPath;
}

function calcSimplePath(cp,pp){
    var simplePath = new Path();
    
    var cplen = cp.length,              //controle points
        pplen = pp.length;              //path points
    if(pplen <= 2){
        if(cplen == 0){ //make it a line
            for(var i=pplen-1; i >= 0; i--){
                pp[i].outx = pp[i].x;
                pp[i].inx = pp[i].x;
                pp[i].outy = pp[i].y;
                pp[i].iny = pp[i].y;
            }
        } else { //make it a curve
            //do first point
            pp[1].outx = pp[1].x+(cp[0].x-pp[1].x)/3;
            pp[1].outy = pp[1].y+(cp[0].y-pp[1].y)/3;
            pp[1].inx = pp[1].x;
            pp[1].iny = pp[1].y;
            //do last point
            pp[0].outx = pp[0].x;
            pp[0].outy = pp[0].y;
            pp[0].inx = pp[0].x+(cp[0].x-pp[0].x)/3;
            pp[0].iny = pp[0].y+(cp[0].y-pp[0].y)/3;

        }
    } else {
        // insert controlepoints to array
        for(var i = pplen-2; i >= 1; i--){
            var prevp = pp[i-1],            //previous point
                thisp = pp[i],              //this point
                nextp = pp[i+1],            //next point
                prevc = null,               //previous controle
                nextc = null;               //next controle
                
            //get prev controle point
            if (prevp.pos != thisp.pos-1){ /////////!!! DUHUH the first one is not set yet ///////////////////////////////////////////////////////
                prevc = getCP(cp,thisp.pos);
            }
            //get next controle point
            if (thisp.pos != nextp.pos-1){
                nextc = getCP(cp,nextp.pos);
            }
            
            // find angle for controle points
            var p0 = null,p2 = null;
            if(prevc != null) {
                var p0 = new Point(prevc.x, prevc.y);
            } else {
                var p0 = new Point(prevp.x, prevp.y);
            }
            if(nextc != null) {
                p2 = new Point(nextc.x, nextc.y);
            } else {
                p2 = new Point(nextp.x, nextp.y);
            }
            var dirV = p2 - p0,                 //direction vector
                ang = Math.abs(dirV.angle);

            if(ang >= 45 && ang <= 135 || ang >= 225 && ang <= 315){
                var horz = false;
            } else {
                var horz = true;
            }
            if(horz == true){
                //set handles horizontal
                if(prevc != null){
                    thisp.outx = prevc.x;
                } else {
                    thisp.outx = (thisp.x - prevp.x)/3;
                }
                if(nextc != null){
                    thisp.inx = nextc.x;
                } else {
                    thisp.inx = (nextp.x - thisp.x)/3;
                }
                thisp.iny = thisp.y;            
                thisp.outy = thisp.y;
            } else {
                //horz == false //set handles vertical
                if(prevc != null){
                    thisp.outy = prevc.y;
                } else {
                    thisp.outy = (thisp.y - prevp.y)/3;
                }
                if(nextc != null){
                    thisp.iny = nextc.y;
                } else {
                    thisp.iny = (nextp.y-thisp.y)/3;
                }
                thisp.inx = thisp.x;
                thisp.outx = thisp.x;
            }
        }
        
        ////////////////// END POINT /////////////////////////
        var prevp = pp[1],              //previous point
            thisp = pp[0],              //this point (first)
            prevc = null;               //previous controle

        //create vector
        var sp = new Point(thisp.x,thisp.y),
            ep = new Point(prevp.outx,prevp.outy),
            dirV = ep - sp;
        
        dirV /=2.5;
        var np = sp + dirV;
        thisp.inx = np.x;
        thisp.iny = np.y;
        thisp.outx = thisp.x;
        thisp.outy = thisp.y;
        
        ////////////////// START POINT /////////////////////////
        var nextp = pp[pp.length-2],                //next point
            thisp = pp[pp.length-1],                //this point (first)
            nextc = null;                           //next controle

        //create vector
        var sp = new Point(thisp.x,thisp.y);        //start point
        var ep = new Point(nextp.inx,nextp.iny);    //end point
        var dirV = ep - sp;
        dirV /=2.5;
        var np = sp + dirV;
        thisp.outx = np.x;
        thisp.outy = np.y;
        thisp.inx = thisp.x;
        thisp.iny = thisp.y;

    }
    //let’s draw it!    
    drawSimplePath(pp);
}

function drawSimplePath(pp) {
    var simplePath = new Path();
    
    simplePath.strokeColor = 'FC03F0';
    
    var len = pp.length;
    for(var i = len-1; i >= 0; i--){
        var tp = pp[i];
        var thisSegment = new Segment(tp.x, tp.y, tp.inx-tp.x, tp.iny-tp.y, tp.outx-tp.x,tp.outy-tp.y);
        simplePath.add(thisSegment);
    }
}

function getCP(cp,x){
    for(var i = cp.length-1; i >= 0; i--){
        if(cp[i].pos == x){
            return cp[i];
        }
    }
    return null;
}

function pointInTriangle(p, a,b,c){
    if( ((p.y-a.y)*(b.x-a.x) - (p.x-a.x)*(b.y-a.y))*((p.y-b.y)*(c.x-b.x) - (p.x-b.x)*(c.y-b.y)) > 0 && 
        ((p.y-b.y)*(c.x-b.x) - (p.x-b.x)*(c.y-b.y))*((p.y-b.y)*(a.x-c.x) - (p.x-c.x)*(a.y-c.y)) > 0 ){
        return true;
    } else {
        return false;
    }
}

function samesign( a, b ) {
  var aPositive = a >= 0;
  var bPositive = b >= 0;
  return aPositive == bPositive;
}

function dotLineLength(x, y, x0, y0, x1, y1, o){
    /*
    function by Jonas Raoni Soares Silva
    found here: http://jsfromhell.com/math/dot-line-length
    x  = point's x coord
    y  = point's y coord
    x0 = x coord of the line's A point
    y0 = y coord of the line's A point
    x1 = x coord of the line's B point
    y1 = y coord of the line's B point
    overLine =  specifies if the distance should respect the limits of the segment (overLine = true) 
                or if it should consider the segment as an infinite line (overLine = false),
    */
    
    function lineLength(x, y, x0, y0){
        return Math.sqrt((x -= x0) * x + (y -= y0) * y);
    }
    if(o && !(o = function(x, y, x0, y0, x1, y1){
        if(!(x1 - x0)) return {x: x0, y: y};
        else if(!(y1 - y0)) return {x: x, y: y0};
        var left, tg = -1 / ((y1 - y0) / (x1 - x0));
        return {x: left = (x1 * (x * tg - y + y0) + x0 * (x * - tg + y - y1)) / (tg * (x1 - x0) + y0 - y1), y: tg * left - tg * x + y};
    }(x, y, x0, y0, x1, y1), o.x >= Math.min(x0, x1) && o.x <= Math.max(x0, x1) && o.y >= Math.min(y0, y1) && o.y <= Math.max(y0, y1))){
        var l1 = lineLength(x, y, x0, y0), l2 = lineLength(x, y, x1, y1);
        return l1 > l2 ? l2 : l1;
    }
    else {
        var a = y0 - y1, b = x1 - x0, c = x0 * y1 - y0 * x1;
        return Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);
    }
}

function switchDirection(diff,dir){
    if(samesign(diff,dir) == true){
        return dir; //same
    } else {
        if(dir > 0){
            dir = -1;
        } else {
            dir = 1;
        }
        return dir; //switched
    }
}