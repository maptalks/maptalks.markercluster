/*!
 * maptalks.markercluster v0.8.1
 * LICENSE : MIT
 * (c) 2016-2018 maptalks.org
 */
/*!
 * requires maptalks@>=0.26.3 
 */
import { Canvas, Coordinate, Geometry, MapboxUtil, Marker, Point, PointExtent, StringUtil, Util, VectorLayer, animation, renderer } from 'maptalks';

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

var options = {
    'maxClusterRadius': 160,
    'textSumProperty': null,
    'symbol': null,
    'drawClusterText': true,
    'textSymbol': null,
    'animation': true,
    'animationDuration': 450,
    'maxClusterZoom': null,
    'noClusterWithOneMarker': true,
    'forceRenderOnZooming': true
};

var ClusterLayer = function (_maptalks$VectorLayer) {
    _inherits(ClusterLayer, _maptalks$VectorLayer);

    function ClusterLayer() {
        _classCallCheck(this, ClusterLayer);

        return _possibleConstructorReturn(this, _maptalks$VectorLayer.apply(this, arguments));
    }

    /**
     * Reproduce a ClusterLayer from layer's profile JSON.
     * @param  {Object} json - layer's profile JSON
     * @return {maptalks.ClusterLayer}
     * @static
     * @private
     * @function
     */
    ClusterLayer.fromJSON = function fromJSON(json) {
        if (!json || json['type'] !== 'ClusterLayer') {
            return null;
        }
        var layer = new ClusterLayer(json['id'], json['options']);
        var geoJSONs = json['geometries'];
        var geometries = [];
        for (var i = 0; i < geoJSONs.length; i++) {
            var geo = Geometry.fromJSON(geoJSONs[i]);
            if (geo) {
                geometries.push(geo);
            }
        }
        layer.addGeometry(geometries);
        return layer;
    };

    ClusterLayer.prototype.addMarker = function addMarker(markers) {
        return this.addGeometry(markers);
    };

    ClusterLayer.prototype.addGeometry = function addGeometry(markers) {
        for (var i = 0, len = markers.length; i <= len; i++) {
            if (!markers[i] instanceof Marker) {
                throw new Error('Only a point(Marker) can be added into a ClusterLayer');
            }
        }
        return _maptalks$VectorLayer.prototype.addGeometry.apply(this, arguments);
    };

    ClusterLayer.prototype.onConfig = function onConfig(conf) {
        _maptalks$VectorLayer.prototype.onConfig.call(this, conf);
        if (conf['maxClusterRadius'] || conf['symbol'] || conf['drawClusterText'] || conf['textSymbol'] || conf['maxClusterZoom']) {
            var renderer$$1 = this._getRenderer();
            if (renderer$$1) {
                renderer$$1.render();
            }
        }
        return this;
    };

    /**
     * Identify the clusters on the given coordinate
     * @param  {maptalks.Coordinate} coordinate   - coordinate to identify
     * @return {Object|Geometry[]}  result: cluster { center : [cluster's center], children : [geometries in the cluster] } or markers
     */


    ClusterLayer.prototype.identify = function identify(coordinate, options) {
        var map = this.getMap(),
            maxZoom = this.options['maxClusterZoom'];
        if (maxZoom && map && map.getZoom() > maxZoom) {
            return _maptalks$VectorLayer.prototype.identify.call(this, coordinate, options);
        }
        if (this._getRenderer()) {
            return this._getRenderer().identify(coordinate, options);
        }
        return null;
    };

    /**
     * Export the ClusterLayer's JSON.
     * @return {Object} layer's JSON
     */


    ClusterLayer.prototype.toJSON = function toJSON() {
        var json = _maptalks$VectorLayer.prototype.toJSON.call(this);
        json['type'] = 'ClusterLayer';
        return json;
    };
    /**
     * Get the ClusterLayer's current clusters
     * @return {Object} layer's clusters
     **/


    ClusterLayer.prototype.getClusters = function getClusters() {
        var renderer$$1 = this._getRenderer();
        if (renderer$$1) {
            return renderer$$1._currentClusters || [];
        }
        return [];
    };

    return ClusterLayer;
}(VectorLayer);

// merge to define ClusterLayer's default options.
ClusterLayer.mergeOptions(options);

// register ClusterLayer's JSON type for JSON deserialization.
ClusterLayer.registerJSONType('ClusterLayer');

var defaultTextSymbol = {
    'textFaceName': '"microsoft yahei"',
    'textSize': 16,
    'textDx': 0,
    'textDy': 0
};

var defaultSymbol = {
    'markerType': 'ellipse',
    'markerFill': { property: 'count', type: 'interval', stops: [[0, 'rgb(135, 196, 240)'], [9, '#1bbc9b'], [99, 'rgb(216, 115, 149)']] },
    'markerFillOpacity': 0.7,
    'markerLineOpacity': 1,
    'markerLineWidth': 3,
    'markerLineColor': '#fff',
    'markerWidth': { property: 'count', type: 'interval', stops: [[0, 40], [9, 60], [99, 80]] },
    'markerHeight': { property: 'count', type: 'interval', stops: [[0, 40], [9, 60], [99, 80]] }
};

ClusterLayer.registerRenderer('canvas', function (_maptalks$renderer$Ve) {
    _inherits(_class, _maptalks$renderer$Ve);

    function _class(layer) {
        _classCallCheck(this, _class);

        var _this2 = _possibleConstructorReturn(this, _maptalks$renderer$Ve.call(this, layer));

        _this2._animated = true;
        _this2._refreshStyle();
        _this2._clusterNeedRedraw = true;
        return _this2;
    }

    _class.prototype.checkResources = function checkResources() {
        var symbol = this.layer.options['symbol'] || defaultSymbol;
        var resources = _maptalks$renderer$Ve.prototype.checkResources.apply(this, arguments);
        if (symbol !== this._symbolResourceChecked) {
            var res = Util.getExternalResources(symbol, true);
            if (res) {
                resources.push.apply(resources, res);
            }
            this._symbolResourceChecked = symbol;
        }
        return resources;
    };

    _class.prototype.draw = function draw() {
        if (!this.canvas) {
            this.prepareCanvas();
        }
        var map = this.getMap();
        var zoom = map.getZoom();
        var maxClusterZoom = this.layer.options['maxClusterZoom'];
        if (maxClusterZoom && zoom > maxClusterZoom) {
            delete this._currentClusters;
            this._markersToDraw = this.layer._geoList;
            _maptalks$renderer$Ve.prototype.draw.apply(this, arguments);
            return;
        }
        if (this._clusterNeedRedraw) {
            this._clearDataCache();
            this._computeGrid();
            this._clusterNeedRedraw = false;
        }
        var zoomClusters = this._clusterCache[zoom] ? this._clusterCache[zoom]['clusters'] : null;

        var clusters = this._getClustersToDraw(zoomClusters);
        clusters.zoom = zoom;
        this._drawLayer(clusters);
    };

    _class.prototype._getClustersToDraw = function _getClustersToDraw(zoomClusters) {
        this._markersToDraw = [];
        var map = this.getMap();
        var font = StringUtil.getFont(this._textSymbol),
            digitLen = StringUtil.stringLength('9', font).toPoint();
        var extent = map.getContainerExtent(),
            clusters = [];
        var pt = void 0,
            pExt = void 0,
            sprite = void 0,
            width = void 0,
            height = void 0;
        for (var p in zoomClusters) {
            this._currentGrid = zoomClusters[p];
            if (zoomClusters[p]['count'] === 1 && this.layer.options['noClusterWithOneMarker']) {
                var marker = zoomClusters[p]['children'][0];
                marker._cluster = zoomClusters[p];
                this._markersToDraw.push(marker);
                continue;
            }
            sprite = this._getSprite();
            width = sprite.canvas.width;
            height = sprite.canvas.height;
            pt = map._prjToContainerPoint(zoomClusters[p]['center']);
            pExt = new PointExtent(pt.sub(width, height), pt.add(width, height));
            if (!extent.intersects(pExt)) {
                continue;
            }

            if (!zoomClusters[p]['textSize']) {
                var text = this._getClusterText(zoomClusters[p]);
                zoomClusters[p]['textSize'] = new Point(digitLen.x * text.length, digitLen.y)._multi(1 / 2);
            }
            clusters.push(zoomClusters[p]);
        }
        return clusters;
    };

    _class.prototype.drawOnInteracting = function drawOnInteracting() {
        if (this._currentClusters) {
            this._drawClusters(this._currentClusters, 1);
        }
        _maptalks$renderer$Ve.prototype.drawOnInteracting.apply(this, arguments);
    };

    _class.prototype.forEachGeo = function forEachGeo(fn, context) {
        if (this._markersToDraw) {
            this._markersToDraw.forEach(function (g) {
                if (context) {
                    fn.call(context, g);
                } else {
                    fn(g);
                }
            });
        }
    };

    _class.prototype.onGeometryAdd = function onGeometryAdd() {
        this._clusterNeedRedraw = true;
        _maptalks$renderer$Ve.prototype.onGeometryAdd.apply(this, arguments);
    };

    _class.prototype.onGeometryRemove = function onGeometryRemove() {
        this._clusterNeedRedraw = true;
        _maptalks$renderer$Ve.prototype.onGeometryRemove.apply(this, arguments);
    };

    _class.prototype.onGeometryPositionChange = function onGeometryPositionChange() {
        this._clusterNeedRedraw = true;
        _maptalks$renderer$Ve.prototype.onGeometryPositionChange.apply(this, arguments);
    };

    _class.prototype.onRemove = function onRemove() {
        this._clearDataCache();
    };

    _class.prototype.identify = function identify(coordinate, options) {
        var map = this.getMap(),
            maxZoom = this.layer.options['maxClusterZoom'];
        if (maxZoom && map.getZoom() > maxZoom) {
            return _maptalks$renderer$Ve.prototype.identify.call(this, coordinate, options);
        }
        if (this._currentClusters) {
            var point = map.coordinateToContainerPoint(coordinate);
            var old = this._currentGrid;
            for (var i = 0; i < this._currentClusters.length; i++) {
                var c = this._currentClusters[i];
                var pt = map._prjToContainerPoint(c['center']);
                this._currentGrid = c;
                var markerWidth = this._getSprite().canvas.width;

                if (point.distanceTo(pt) <= markerWidth) {
                    return {
                        'center': map.getProjection().unproject(c.center.copy()),
                        'children': c.children.slice(0)
                    };
                }
            }
            this._currentGrid = old;
        }

        // if no clusters is hit, identify markers
        if (this._markersToDraw) {
            return this.layer._hitGeos(this._markersToDraw, coordinate, options);
        }
        return null;
    };

    _class.prototype.onSymbolChanged = function onSymbolChanged() {
        this._refreshStyle();
        this._computeGrid();
        this._stopAnim();
        this.setToRedraw();
    };

    _class.prototype._refreshStyle = function _refreshStyle() {
        var _this3 = this;

        var symbol = this.layer.options['symbol'] || defaultSymbol;
        var textSymbol = this.layer.options['textSymbol'] || defaultTextSymbol;
        var argFn = function argFn() {
            return [_this3.getMap().getZoom(), _this3._currentGrid];
        };
        this._symbol = MapboxUtil.loadFunctionTypes(symbol, argFn);
        this._textSymbol = MapboxUtil.loadFunctionTypes(textSymbol, argFn);
    };

    _class.prototype._drawLayer = function _drawLayer(clusters) {
        var _this4 = this;

        var parentClusters = this._currentClusters || clusters;
        this._currentClusters = clusters;
        delete this._clusterMaskExtent;
        var layer = this.layer;
        //if (layer.options['animation'] && this._animated && this._inout === 'out') {
        if (layer.options['animation'] && this._animated && this._inout) {
            var dr = [0, 1];
            if (this._inout === 'in') {
                dr = [1, 0];
            }
            this._player = animation.Animation.animate({ 'd': dr }, { 'speed': layer.options['animationDuration'], 'easing': 'inAndOut' }, function (frame) {
                if (frame.state.playState === 'finished') {
                    _this4._animated = false;
                    _this4._drawClusters(clusters, 1);
                    _this4._drawMarkers();
                    _this4.completeRender();
                } else {
                    if (_this4._inout === 'in') {
                        _this4._drawClustersFrame(clusters, parentClusters, frame.styles.d);
                    } else {
                        _this4._drawClustersFrame(parentClusters, clusters, frame.styles.d);
                    }
                    _this4.setCanvasUpdated();
                }
            }).play();
        } else {
            this._animated = false;
            this._drawClusters(clusters, 1);
            this._drawMarkers();
            this.completeRender();
        }
    };

    _class.prototype._drawMarkers = function _drawMarkers() {
        _maptalks$renderer$Ve.prototype.drawGeos.call(this, this._clusterMaskExtent);
    };

    _class.prototype._drawClustersFrame = function _drawClustersFrame(parentClusters, toClusters, ratio) {
        var _this5 = this;

        this._clusterMaskExtent = this.prepareCanvas();
        var map = this.getMap(),
            drawn = {};
        if (parentClusters) {
            parentClusters.forEach(function (c) {
                var p = map._prjToContainerPoint(c['center']);
                if (!drawn[c.key]) {
                    drawn[c.key] = 1;
                    _this5._drawCluster(p, c, 1 - ratio);
                }
            });
        }
        if (ratio === 0 || !toClusters) {
            return;
        }
        var z = parentClusters.zoom,
            r = map._getResolution(z) * this.layer.options['maxClusterRadius'],
            min = this._markerExtent.getMin();
        toClusters.forEach(function (c) {
            var pt = map._prjToContainerPoint(c['center']);
            var center = c.center;
            var pgx = Math.floor((center.x - min.x) / r),
                pgy = Math.floor((center.y - min.y) / r);
            var pkey = pgx + '_' + pgy;
            var parent = _this5._clusterCache[z]['clusterMap'][pkey];
            if (parent) {
                var pp = map._prjToContainerPoint(parent['center']);
                pt = pp.add(pt.sub(pp)._multi(ratio));
            }
            _this5._drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
        });
    };

    _class.prototype._drawClusters = function _drawClusters(clusters, ratio) {
        var _this6 = this;

        if (!clusters) {
            return;
        }
        this._clusterMaskExtent = this.prepareCanvas();
        var map = this.getMap();
        clusters.forEach(function (c) {
            var pt = map._prjToContainerPoint(c['center']);
            _this6._drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
        });
    };

    _class.prototype._drawCluster = function _drawCluster(pt, cluster, op) {
        this._currentGrid = cluster;
        var ctx = this.context;
        var sprite = this._getSprite();
        var opacity = ctx.globalAlpha;
        if (opacity * op === 0) {
            return;
        }
        ctx.globalAlpha = opacity * op;
        if (sprite) {
            var pos = pt.add(sprite.offset)._sub(sprite.canvas.width / 2, sprite.canvas.height / 2);
            ctx.drawImage(sprite.canvas, pos.x, pos.y);
        }

        if (this.layer.options['drawClusterText'] && cluster['textSize']) {
            Canvas.prepareCanvasFont(ctx, this._textSymbol);
            var dx = this._textSymbol['textDx'] || 0;
            var dy = this._textSymbol['textDy'] || 0;
            var text = this._getClusterText(cluster);
            Canvas.fillText(ctx, text, pt.sub(cluster['textSize']).add(dx, dy));
        }
        ctx.globalAlpha = opacity;
    };

    _class.prototype._getClusterText = function _getClusterText(cluster) {
        var text = this.layer.options['textSumProperty'] ? cluster['textSumProperty'] : cluster['count'];
        return text + '';
    };

    _class.prototype._getSprite = function _getSprite() {
        if (!this._spriteCache) {
            this._spriteCache = {};
        }
        var key = Util.getSymbolStamp(this._symbol);
        if (!this._spriteCache[key]) {
            this._spriteCache[key] = new Marker([0, 0], { 'symbol': this._symbol })._getSprite(this.resources, this.getMap().CanvasClass);
        }
        return this._spriteCache[key];
    };

    _class.prototype._initGridSystem = function _initGridSystem() {
        var points = [];
        var extent = void 0,
            c = void 0;
        this.layer.forEach(function (g) {
            c = g._getPrjCoordinates();
            if (!extent) {
                extent = g._getPrjExtent();
            } else {
                extent = extent._combine(g._getPrjExtent());
            }
            points.push({
                x: c.x,
                y: c.y,
                id: g._getInternalId(),
                geometry: g
            });
        });
        this._markerExtent = extent;
        this._markerPoints = points;
    };

    _class.prototype._computeGrid = function _computeGrid() {
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
    };

    _class.prototype._computeZoomGrid = function _computeZoomGrid(zoom) {
        if (!this._markerExtent) {
            return null;
        }
        var map = this.getMap(),
            r = map._getResolution(zoom) * this.layer.options['maxClusterRadius'],
            preT = map._getResolution(zoom - 1) ? map._getResolution(zoom - 1) * this.layer.options['maxClusterRadius'] : null;
        var preCache = this._clusterCache[zoom - 1];
        if (!preCache && zoom - 1 >= map.getMinZoom()) {
            this._clusterCache[zoom - 1] = preCache = this._computeZoomGrid(zoom - 1);
        }
        // 1. format extent of markers to grids with raidus of r
        // 2. find point's grid in the grids
        // 3. sum up the point into the grid's collection
        var points = this._markerPoints;
        var sumProperty = this.layer.options['textSumProperty'];
        var grids = {},
            min = this._markerExtent.getMin();
        var gx = void 0,
            gy = void 0,
            key = void 0,
            pgx = void 0,
            pgy = void 0,
            pkey = void 0;
        for (var i = 0, len = points.length; i < len; i++) {
            var geo = points[i].geometry;
            var sumProp = 0;

            if (sumProperty && geo.getProperties() && geo.getProperties()[sumProperty]) {
                sumProp = geo.getProperties()[sumProperty];
            }

            gx = Math.floor((points[i].x - min.x) / r);
            gy = Math.floor((points[i].y - min.y) / r);
            key = gx + '_' + gy;
            if (!grids[key]) {
                grids[key] = {
                    'sum': new Coordinate(points[i].x, points[i].y),
                    'center': new Coordinate(points[i].x, points[i].y),
                    'count': 1,
                    'textSumProperty': sumProp,
                    'children': [geo],
                    'key': key + ''
                };
                if (preT && preCache) {
                    pgx = Math.floor((points[i].x - min.x) / preT);
                    pgy = Math.floor((points[i].y - min.y) / preT);
                    pkey = pgx + '_' + pgy;
                    grids[key]['parent'] = preCache['clusterMap'][pkey];
                }
            } else {

                grids[key]['sum']._add(new Coordinate(points[i].x, points[i].y));
                grids[key]['count']++;
                grids[key]['center'] = grids[key]['sum'].multi(1 / grids[key]['count']);
                grids[key]['children'].push(geo);
                grids[key]['textSumProperty'] += sumProp;
            }
        }
        return this._mergeClusters(grids, r / 2);
    };

    _class.prototype._mergeClusters = function _mergeClusters(grids, r) {
        var clusterMap = {};
        for (var p in grids) {
            clusterMap[p] = grids[p];
        }

        // merge adjacent clusters
        var merging = {};

        var visited = {};
        // find clusters need to merge
        var c1 = void 0,
            c2 = void 0;
        for (var _p in grids) {
            c1 = grids[_p];
            if (visited[c1.key]) {
                continue;
            }
            var gxgy = c1.key.split('_');
            var gx = +gxgy[0],
                gy = +gxgy[1];
            //traverse adjacent grids
            for (var ii = -1; ii <= 1; ii++) {
                for (var iii = -1; iii <= 1; iii++) {
                    if (ii === 0 && iii === 0) {
                        continue;
                    }
                    var key2 = gx + ii + '_' + (gy + iii);
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
                    grid['textSumProperty'] += toMerge[i].textSumProperty;
                    grid['children'].concat(toMerge[i].geometry);
                    clusterMap[toMerge[i].key] = grid;
                    delete grids[toMerge[i].key];
                }
            }
            grid['center'] = grid['sum'].multi(1 / grid['count']);
        }

        return {
            'clusters': grids,
            'clusterMap': clusterMap
        };
    };

    _class.prototype._distanceTo = function _distanceTo(c1, c2) {
        var x = c1.x - c2.x,
            y = c1.y - c2.y;
        return Math.sqrt(x * x + y * y);
    };

    _class.prototype._stopAnim = function _stopAnim() {
        if (this._player && this._player.playState !== 'finished') {
            this._player.finish();
        }
    };

    _class.prototype.onZoomStart = function onZoomStart(param) {
        this._stopAnim();
        _maptalks$renderer$Ve.prototype.onZoomStart.call(this, param);
    };

    _class.prototype.onZoomEnd = function onZoomEnd(param) {
        if (this.layer.isEmpty() || !this.layer.isVisible()) {
            _maptalks$renderer$Ve.prototype.onZoomEnd.apply(this, arguments);
            return;
        }
        this._inout = param['from'] > param['to'] ? 'in' : 'out';
        this._animated = true;
        this._computeGrid();
        _maptalks$renderer$Ve.prototype.onZoomEnd.apply(this, arguments);
    };

    _class.prototype._clearDataCache = function _clearDataCache() {
        this._stopAnim();
        delete this._markerExtent;
        delete this._markerPoints;
        delete this._clusterCache;
        delete this._zoomInClusters;
    };

    return _class;
}(renderer.VectorLayerCanvasRenderer));

export { ClusterLayer };

typeof console !== 'undefined' && console.log('maptalks.markercluster v0.8.1, requires maptalks@>=0.26.3.');
