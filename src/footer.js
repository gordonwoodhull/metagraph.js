return metagraph;
}
    if (typeof define === 'function' && define.amd) {
        define([], _metagraph);
    } else if (typeof module == "object" && module.exports) {
        module.exports = _metagraph();
    } else {
        this.metagraph = _metagraph();
    }
}
)();
