/*
 * sourcemap with cache utility api
 * @module   util/sourcemap
 * @author   genify(caijf@corp.netease.com)
 */
var sourcemap = require('source-map');
var _io = require('./io');

// private variable
var _gCache = {};

/**
 * get sourcemap data from cache
 * @param  {String} uri - resource uri
 */
exports.getSourceMap = function(uri){
    return _gCache[uri] ? JSON.parse(_gCache[uri]) : null;
};

/**
 * nej sourcemap
 * @param {String} uri resource uri
 * @param {String} content resource content after nej translate
 * @param {String} original resource origin content
 */
exports.nej = function(uri, content, original){
    var originalLines = original.split('\n');
    var newLines = content.split('\n');
    
    var i = (content === original) ? 0 : 1

    var oriLineNum = 0;
    var oriLength = originalLines.length
    this._sourceMap = new sourcemap.SourceMapGenerator({file: uri});
    for (var newLength = newLines.length; i < newLength; i++) {

        for (; oriLineNum < oriLength;) {
            if(newLines[i] == originalLines[oriLineNum++]){
                break;
            }
        }

        this._sourceMap.addMapping({
            generated: { line: i + 1, column: 0 },
            original: { line: oriLineNum, column: 0 },
            source: uri
        });
    }
    this._sourceMap.setSourceContent(uri, original);
    _gCache[uri] = this._sourceMap.toString();
};

/**
 * concat uri files's source map
 * @param {String} uri resource uri
 * @param {Array} list dep resource uris
 */
exports.concat = function(uri, list){
    this._sourceMap = new sourcemap.SourceMapGenerator({file: uri});
    var separatorLineOffset = 0;
    (list||[]).forEach(function(file){
        var content = this.getSourceMap(file);
        if(!content){
            content = _io.getFromCache(file);
            this.nej(file, content, content);
            content = _gCache[file];
        }
        var consumer = new sourcemap.SourceMapConsumer(content);
        var lineOffset = separatorLineOffset || 0;        
        var _this = this;
        consumer.eachMapping(function(mapping) {
            if (mapping.source) {
                _this._sourceMap.addMapping({
                    generated: {
                        line: lineOffset + mapping.generatedLine,
                        column: 0
                    },
                    original: {
                        line: mapping.originalLine,
                        column: 0
                    },
                    source: mapping.source,
                    name: mapping.name
                });
                separatorLineOffset = lineOffset + mapping.generatedLine;
            }
        });
        if(consumer.sourcesContent){
            consumer.sourcesContent.forEach(function(sourceContent, i) {
                _this._sourceMap.setSourceContent(consumer.sources[i], sourceContent);
            });
        }
    },this);

    _gCache[uri] = this._sourceMap.toString();
};

/**
 * format sourcemap's sources path
 * @param {String} mapString source map String
 * @param {String} webRoot
 */
exports.format = function(mapString, webRoot){
    var map = JSON.parse(mapString || '{}');
    (map.sources || []).forEach(function(source, i){
        map.sources[i] = map.sources[i].replace(webRoot, 'nej:///');
    });
    return JSON.stringify(map);
};


