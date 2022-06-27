(function() {
    let wrapper = document.getElementById('wrapper');
    let panel = document.getElementById('panel');

    wrapper.addEventListener('pointermove', e => {
        let xr = 10 * ((wrapper.clientHeight / 2) - e.pageY) / (wrapper.clientHeight / 2);
        let yr = 10 * (e.pageX - (wrapper.clientWidth / 2)) / (wrapper.clientWidth / 2);

        panel.style.setProperty('--x-rot', `${xr}deg`);
        panel.style.setProperty('--y-rot', `${yr}deg`);
    });
})();