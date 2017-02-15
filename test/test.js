describe('ClusterLayer', function () {
    var container, map;
    beforeEach(function () {
        container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '300px';
        document.body.appendChild(container);
        map = new maptalks.Map(container, {
            center : [0, 0],
            zoom : 17
        });
    });

    afterEach(function () {
        map.remove();
    });

    it('should display marker when added with one marker', function (done) {
        var layer = new maptalks.ClusterLayer('g', [new maptalks.Marker(map.getCenter())]);
        layer.on('layerload', function () {
            expect(layer).not.to.be.painted(0, -1);
            expect(layer._getRenderer()._markerLayer).to.be.painted(0, -1);
            done();
        })
         .addTo(map);
    });

    it('should display cluster when added with 2 markers', function (done) {
        var layer = new maptalks.ClusterLayer('g', [new maptalks.Marker(map.getCenter()), new maptalks.Marker(map.getCenter())]);
        layer.on('layerload', function () {
            expect(layer).to.be.painted();
            expect(layer._getRenderer()._markerLayer).not.to.be.painted(0, -1);
            done();
        })
         .addTo(map);
    });

    it('should display marker if remove a marker from 2 markers cluster', function (done) {
        var marker = new maptalks.Marker(map.getCenter());
        var layer = new maptalks.ClusterLayer('g', [marker, new maptalks.Marker(map.getCenter())]);
        layer.once('layerload', function () {
            layer.once('layerload', function () {
                expect(layer).not.to.be.painted(0, -1);
                expect(layer._getRenderer()._markerLayer).to.be.painted(0, -1);
                done();
            });
            marker.remove();
        })
         .addTo(map);
    });

    it('should display if added again after removed', function (done) {
        var layer = new maptalks.ClusterLayer('g', [new maptalks.Marker(map.getCenter()), new maptalks.Marker(map.getCenter())]);
        layer.once('layerload', function () {
            expect(layer).to.be.painted();
            map.removeLayer(layer);
            layer.once('layerload', function () {
                expect(layer).to.be.painted();
                done();
            });
            map.addLayer(layer);
        });
        map.addLayer(layer);
    });

    it('should show', function (done) {
        var layer = new maptalks.ClusterLayer('g', [new maptalks.Marker(map.getCenter()), new maptalks.Marker(map.getCenter())], { visible : false });
        layer.once('layerload', function () {
            expect(layer).not.to.be.painted();
            layer.once('layerload', function () {
                expect(layer).to.be.painted();
                done();
            });
            layer.show();
        });
        map.addLayer(layer);
    });

    it('should hide', function (done) {
        var layer = new maptalks.ClusterLayer('g', [new maptalks.Marker(map.getCenter()), new maptalks.Marker(map.getCenter())]);
        layer.once('layerload', function () {
            expect(layer).to.be.painted();
            layer.once('hide', function () {
                expect(layer).not.to.be.painted();
                done();
            });
            layer.hide();
        });
        map.addLayer(layer);
    });

    it('should display markers when zoom is bigger than maxClusterZoom', function (done) {
        var layer = new maptalks.ClusterLayer('g', [new maptalks.Marker(map.getCenter()), new maptalks.Marker(map.getCenter())], { 'maxClusterZoom' : 16 });
        layer.on('layerload', function () {
            expect(layer).not.to.be.painted();
            expect(layer._getRenderer()._markerLayer).not.to.be.painted(0, -1);
            expect(layer._getRenderer()._allMarkerLayer).to.be.painted(0, -1);
            done();
        })
         .addTo(map);
    });
    //TODO 1. update marker's symbol
    //TODO 2. update marker's symbol when zoom > maxClusterZoom

});
