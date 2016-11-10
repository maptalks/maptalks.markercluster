//version:1.1.0
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

var maptalks = (typeof window !== "undefined" ? window['maptalks'] : typeof global !== "undefined" ? global['maptalks'] : null);

function getGradient(color) {
    return 'rgba(' + color.join() + ', 1)';
    /*return {
        type : 'radial',
        colorStops : [
            [0.00, 'rgba(' + color.join() + ', 0)'],
            [0.50, 'rgba(' + color.join() + ', 1)'],
            [1.00, 'rgba(' + color.join() + ', 1)']
        ]
    };*/
}

var textSymbol = {
    'textFaceName'      : '"microsoft yahei"',
    'textSize'          : 16
};

var defaultSymbol = {
    'markerType' : 'ellipse',
    'markerFill' : {property:'count', type:'interval', stops: [[0, 'rgb(135, 196, 240)'], [9, '#1bbc9b'], [99, 'rgb(216, 115, 149)']]},
    'markerFillOpacity' : 0.7,
    'markerLineOpacity' : 1,
    'markerLineWidth' : 3,
    'markerLineColor' : '#fff',
    'markerWidth' : {property:'count', type:'interval', stops: [[0, 40], [9, 60], [99, 80]]},
    'markerHeight' : {property:'count', type:'interval', stops: [[0, 40], [9, 60], [99, 80]]}
};

module.exports = maptalks.ClusterLayer = maptalks.VectorLayer.extend({
    options: {
        'maxClusterRadius' : 160,
        'geometryEvents' : false,
        'symbol' : null,
        'drawClusterText' : true,
        'textSymbol' : null,
        'animation' : true,
        'animationDuration' : 450
    },

    onConfig: function (conf) {
        if (conf.hasOwnProperty('symbol')) {
            if (this._getRenderer()) {
                this._getRenderer().onSymbolChanged();
            }
        }
        return maptalks.VectorLayer.prototype.onConfig.apply(this. arguments);
    },

    addMarker: function (markers) {
        return this.addGeometry(markers);
    },

    addGeometry: function (markers) {
        for (var i = 0, len = markers.length; i <= len; i++) {
            if (!markers[i] instanceof maptalks.Marker) {
                throw new Error('Only a point(Marker) can be added into a ClusterLayer');
            }
        }
        return maptalks.VectorLayer.prototype.addGeometry.apply(this, arguments);
    },

    /**
     * Identify the clusters on the given container point
     * @param  {maptalks.Point} point   - 2d point
     * @return {Object}  result: { center : [cluster's center], children : [geometries in the cluster] }
     */
    identify: function (point) {
        if (this._getRenderer()) {
            return this._getRenderer().identify(point);
        }
        return null;
    }

});

/**
 * Export the ClusterLayer's profile JSON.
 * @return {Object} layer's profile JSON
 */
maptalks.ClusterLayer.prototype.toJSON = function () {
    var json = maptalks.VectorLayer.prototype.toJSON.call(this);
    json['type'] = 'ClusterLayer';
    return json;
};

/**
 * Reproduce a ClusterLayer from layer's profile JSON.
 * @param  {Object} json - layer's profile JSON
 * @return {maptalks.ClusterLayer}
 * @static
 * @private
 * @function
 */
maptalks.ClusterLayer.fromJSON = function (json) {
    if (!json || json['type'] !== 'ClusterLayer') { return null; }
    var layer = new maptalks.ClusterLayer(json['id'], json['options']);
    var geoJSONs = json['geometries'];
    var geometries = [],
        geo;
    for (var i = 0; i < geoJSONs.length; i++) {
        geo = maptalks.Geometry.fromJSON(geoJSONs[i]);
        if (geo) {
            geometries.push(geo);
        }
    }
    layer.addGeometry(geometries);
    return layer;
};

maptalks.ClusterLayer.registerRenderer('canvas', maptalks.renderer.Canvas.extend({

    initialize: function (layer) {
        this.layer = layer;
        var id = maptalks.internalLayerPrefix + '_grid_' + maptalks.Util.GUID();
        this._markerLayer = new maptalks.VectorLayer(id).addTo(layer.getMap());
        this._animated = true;
        this._refreshStyle();
        this._computeGrid();
    },

    checkResources: function () {
        return maptalks.Util.getExternalResources(this.layer.options['symbol'] || defaultSymbol, true);
    },

    draw: function () {
        if (this._geoCount === undefined || this.layer.getCount() !== this._geoCount) {
            this._clearDataCache();
            this._computeGrid();
        }
        if (!this.canvas) {
            this.prepareCanvas();
        }
        var font = maptalks.symbolizer.TextMarkerSymbolizer.getFont(textSymbol);
        var map = this.getMap(),
            extent = map.getContainerExtent(),
            symbol = this._symbol,
            marker, markers = [], clusters = [],
            pt, pExt, width, height;
        for (var p in this._clusters) {
            this._currentGrid = this._clusters[p];
            if (this._clusters[p]['count'] === 1) {
                marker = this._clusters[p]['children'][0].copy().copyEventListeners(this._clusters[p]['children'][0]);
                marker._cluster = this._clusters[p];
                markers.push(marker);
                continue;
            }
            width = symbol['markerWidth'];
            height = symbol['markerHeight'];
            pt = map._prjToContainerPoint(this._clusters[p]['center']);
            pExt = new maptalks.PointExtent(pt.substract(width, height), pt.add(width, height));
            if (!extent.intersects(pExt)) {
                continue;
            }
            if (!this._clusters[p]['textSize']) {
                this._clusters[p]['textSize'] = maptalks.StringUtil.stringLength(this._clusters[p]['count'], font).toPoint()._multi(1 / 2);
            }
            clusters.push(this._clusters[p]);
        }
        this._drawLayer(clusters, markers);
    },

    show: function () {
        this._markerLayer.show();
        maptalks.renderer.Canvas.prototype.show.call(this);
    },

    hide: function () {
        this._markerLayer.hide();
        maptalks.renderer.Canvas.prototype.hide.call(this);
    },

    setZIndex: function (z) {
        this._markerLayer.setZIndex(z);
        maptalks.renderer.Canvas.prototype.setZIndex.call(this, z);
    },

    transform: function (matrix) {
        if (this._currentClusters) {
            this._drawClusters(this._currentClusters, 1, matrix);
        }
        return true;
    },


    identify: function (point) {
        var map = this.getMap();
        point = map._pointToContainerPoint(point);
        if (!this._currentClusters) {
            return null;
        }
        var old = this._currentGrid;
        for (var i = 0; i < this._currentClusters.length; i++) {
            var c = this._currentClusters[i];
            var pt = map._prjToContainerPoint(c['center']);
            this._currentGrid = c;
            var markerWidth = this._symbol['markerWidth'];

            if (point.distanceTo(pt) <= markerWidth) {
                return {
                    'center'   : map.getProjection().unproject(c.center.copy()),
                    'children' : c.children.slice(0)
                };
            }
        }
        this._currentGrid = old;
        return null;
    },

    onSymbolChanged: function () {
        this._refreshStyle();
        this._computeGrid();
        this._stopAnim();
        this.draw();
    },

    _refreshStyle: function () {
        var symbol = this.layer.options['symbol'] || defaultSymbol;
        var symbolizer = maptalks.symbolizer.VectorMarkerSymbolizer;
        var style = symbolizer.translateLineAndFill(symbol);
        var argFn =  maptalks.Util.bind(function () {
            return [this.getMap().getZoom(), this._currentGrid];
        }, this);
        this._style = maptalks.Util.loadFunctionTypes(style, argFn);
        this._symbol = maptalks.Util.loadFunctionTypes(symbol, argFn);
    },

    _drawLayer: function (clusters, markers, matrix) {
        this._currentClusters = clusters;
        var layer = this.layer;
        var me = this;
        if (layer.options['animation'] && this._animated && this._inout === 'out') {
            this._player = maptalks.Animation.animate(
                {'d' : [0, 1]},
                {'speed' : layer.options['animationDuration'], 'easing' : 'inAndOut'},
                function (frame) {
                    if (frame.state.playState === 'finished') {
                        if (me._markerLayer.getCount() > 0) {
                            me._markerLayer.clear();
                        }
                        me._markerLayer.addGeometry(markers);
                        me._animated = false;
                        me.completeRender();
                    } else {
                        me._drawClusters(clusters, frame.styles.d, matrix);
                        me.requestMapToRender();
                    }
                }
            )
            .play();
            this._drawClusters(clusters, 0, matrix);
            this.requestMapToRender();
        } else {
            this._drawClusters(clusters, 1, matrix);
            if (!matrix && (this._animated || this._markerLayer.getCount() === 0)) {
                if (this._markerLayer.getCount() > 0) {
                    this._markerLayer.clear();
                }
                this._markerLayer.addGeometry(markers);
            }
            this._animated = false;
            this.completeRender();
        }
    },

    _drawClusters: function (clusters, ratio, matrix) {
        matrix = matrix ? matrix['container'] : null;
        this.prepareCanvas();
        var map = this.getMap(),
            ctx = this.context,
            drawn = {};
        maptalks.Canvas.prepareCanvasFont(ctx, textSymbol);
        clusters.forEach(function (c) {
            if (c.parent) {
                var parent = map._prjToContainerPoint(c.parent['center']);
                if (!drawn[c.parent.key]) {
                    if (matrix) {
                        parent = matrix.applyToPointInstance(parent);
                    }
                    drawn[c.parent.key] = 1;
                    this._drawCluster(parent, c.parent, 1 - ratio);
                }
            }
        }, this);
        if (ratio === 0) {
            return;
        }
        clusters.forEach(function (c) {
            var pt = map._prjToContainerPoint(c['center']);
            if (c.parent) {
                var parent = map._prjToContainerPoint(c.parent['center']);
                pt = parent.add(pt.substract(parent)._multi(ratio));
            }
            if (matrix) {
                pt = matrix.applyToPointInstance(pt);
            }
            this._drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
        }, this);

    },

    _drawCluster: function (pt, grid, op) {
        this._currentGrid = grid;
        var ctx = this.context,
            symbol = this._symbol;
        var sprite = this._getSprite();
        var opacity = ctx.globalAlpha;
        if (opacity * op === 0) {
            return;
        }
        ctx.globalAlpha = opacity * op;
        if (sprite) {
            var pos = pt.add(sprite.offset)._substract(sprite.canvas.width / 2, sprite.canvas.height / 2);
            ctx.drawImage(sprite.canvas, pos.x, pos.y);
        }

        // var pExt = new maptalks.PointExtent(pt.substract(width, width), pt.add(width, width));
        // this._style['polygonGradientExtent'] = pExt;
        // maptalks.Canvas.prepareCanvas(ctx, this._style);
        // ctx.beginPath();
        // ctx.arc(pt.x, pt.y, width, 0, 2 * Math.PI);
        // maptalks.Canvas._stroke(ctx, symbol['markerLineOpacity'] * op);
        // maptalks.Canvas.fillCanvas(ctx, symbol['markerFillOpacity'] * op);

        if (this.layer.options['drawClusterText'] && grid['textSize']) {
            maptalks.Canvas.fillText(ctx, grid['count'], pt.substract(grid['textSize']), 'rgba(0,0,0,' + op + ')');
        }
        ctx.globalAlpha = opacity;
    },

    _getSprite: function () {
        if (!this._spriteCache) {
            this._spriteCache = {};
        }
        var key = maptalks.Util.getSymbolStamp(this._symbol);
        if (!this._spriteCache[key]) {
            this._spriteCache[key] = new maptalks.Marker([0, 0], {'symbol' : this._symbol})._getSprite(this.resources);
        }
        return this._spriteCache[key];
    },

    _initGridSystem: function () {
        var extent, points = [];
        var c;
        this.layer.forEach(function (g) {
            c = g._getPrjCoordinates();
            if (!extent) {
                extent = g._getPrjExtent();
            } else {
                extent = extent._combine(g._getPrjExtent());
            }
            points.push({
                x : c.x,
                y : c.y,
                id : g._getInternalId(),
                geometry : g
            });
        }, this);
        this._markerExtent = extent;
        this._markerPoints = points;
    },

    _computeGrid: function () {
        var map = this.getMap(),
            zoom = map.getZoom();
        if (!this._markerExtent) {
            this._initGridSystem();
        }
        if (!this._clusterCache) {
            this._clusterCache = {};
        }
        var pre = map._getResolution(map.getMinZoom()) > map._getResolution(map.getMaxZoom()) ? zoom - 1 : zoom + 1;
        if (this._clusterCache[pre] && this._clusterCache[pre].length === this.layer.getCount()) {
            this._clusterCache[zoom] = this._clusterCache[pre];
        }
        if (!this._clusterCache[zoom]) {
            this._clusterCache[zoom] = this._computeZoomGrid(zoom);
        }
        this._clusters = this._clusterCache[zoom] ? this._clusterCache[zoom]['clusters'] : null;
        this._geoCount = this.layer.getCount();
    },

    _computeZoomGrid: function (zoom) {
        if (!this._markerExtent) {
            return null;
        }
        var map = this.getMap(),
            r = map._getResolution(zoom) * this.layer.options['maxClusterRadius'],
            preCache = this._clusterCache[zoom - 1],
            preT = map._getResolution(zoom - 1) ? map._getResolution(zoom - 1) * this.layer.options['maxClusterRadius'] : null;
        if (!preCache && zoom - 1 >= map.getMinZoom()) {
            this._clusterCache[zoom - 1] = preCache = this._computeZoomGrid(zoom - 1);
        }
        // 1. format extent of markers to grids with raidus of r
        // 2. find point's grid in the grids
        // 3. sum up the point into the grid's collection
        var points = this._markerPoints;
        var grids = {},
            min = this._markerExtent.getMin(),
            gx, gy, key,
            pgx, pgy, pkey;
        for (var i = 0, len = points.length; i < len; i++) {
            gx = Math.floor((points[i].x - min.x) / r);
            gy = Math.floor((points[i].y - min.y) / r);
            key = gx + '_' + gy;
            if (!grids[key]) {
                grids[key] = {
                    'sum' : new maptalks.Coordinate(points[i].x, points[i].y),
                    'center' : new maptalks.Coordinate(points[i].x, points[i].y),
                    'count' : 1,
                    'children' :[points[i].geometry],
                    'key' : key + ''
                };
                if (preT && preCache) {
                    pgx = Math.floor((points[i].x - min.x) / preT);
                    pgy = Math.floor((points[i].y - min.y) / preT);
                    pkey = pgx + '_' + pgy;
                    grids[key]['parent'] = preCache['clusterMap'][pkey];
                }
            } else {
                grids[key]['sum']._add(new maptalks.Coordinate(points[i].x, points[i].y));
                grids[key]['count']++;
                grids[key]['center'] = grids[key]['sum'].multi(1 / grids[key]['count']);
                grids[key]['children'].push(points[i].geometry);
            }
        }
        // return {
        //     'clusters' : grids,
        //     'clusterMap' : grids
        // };
        return this._mergeClusters(grids, r / 2);
    },

    _mergeClusters: function (grids, r) {
        var clusterMap = {};
        var p;
        for (p in grids) {
            clusterMap[p] = grids[p];
        }

        // merge adjacent clusters
        var merging = {};

        var visited = {};
        // find clusters need to merge
        var c1, c2;
        for (p in grids) {
            c1 = grids[p];
            if (visited[c1.key]) {
                continue;
            }
            var gxgy = c1.key.split('_');
            var gx = +(gxgy[0]),
                gy = +(gxgy[1]);
            //traverse adjacent grids
            for (var ii = -1; ii <= 1; ii++) {
                for (var iii = -1; iii <= 1; iii++) {
                    if (ii === 0 && iii === 0) {
                        continue;
                    }
                    var key2 = (gx + ii) + '_' + (gy + iii);
                    c2 = grids[key2];
                    if (c2 && this._distanceTo(c1['center'], c2['center']) <= r) {
                        if (!merging[c1.key]) {
                            merging[c1.key] = [];
                        }
                        merging[c1.key].push(c2);
                        visited[c2.key] = 1;
                    }
                }
            }
        }

        //merge clusters
        for (var m in merging) {
            var grid = grids[m];
            if (!grid) {
                continue;
            }
            var toMerge = merging[m];
            for (var i = 0; i < toMerge.length; i++) {
                if (grids[toMerge[i].key]) {
                    grid['sum']._add(toMerge[i].sum);
                    grid['count'] += toMerge[i].count;
                    grid['children'].concat(toMerge[i].geometry);
                    clusterMap[toMerge[i].key] = grid;
                    delete grids[toMerge[i].key];
                }
            }
            grid['center'] = grid['sum'].multi(1 / grid['count']);
        }

        return {
            'clusters' : grids,
            'clusterMap' : clusterMap
        };
    },

    _distanceTo: function (c1, c2) {
        var x = c1.x - c2.x,
            y = c1.y - c2.y;
        return Math.sqrt(x * x + y * y);
    },

    _stopAnim: function () {
        if (this._player && this._player.playState !== 'finished') {
            this._player.cancel();
        }
    },

    onZoomStart: function (param) {
        this._inout = param['from'] > param['to'] ? 'in' : 'out';
        // if (this._markerLayer.getCount() > 0) {
        //     this._markerLayer.clear();
        // }
        this._stopAnim();
    },

    onZoomEnd: function () {
        this._animated = true;
        // if (this._markerLayer.getCount() > 0) {

        // }
        this._computeGrid();
        maptalks.renderer.Canvas.prototype.onZoomEnd.apply(this, arguments);
    },

    _clearDataCache: function () {
        this._stopAnim();
        this._markerLayer.clear();
        delete this._markerExtent;
        delete this._markerPoints;
        delete this._clusterCache;
    }
}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
