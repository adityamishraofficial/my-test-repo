/* Force the toolbar popup to appear ABOVE the table */
.tox-pop.tox-pop--bottom {
  margin-bottom: 8px;
}

.tox-pop.tox-pop--top {
  margin-top: 8px;
}

/* Prevent it from overlapping table content */
.tox .tox-pop {
  z-index: 1300;
  position: absolute !important;
}

/* Push popup above the element */
.tox-pop__dialog {
  transform: translateY(-100%);
}

option 2:

tinymce.init({
  selector: '#your-editor',
  toolbar_location: 'top',   // fixes toolbar at top always
  inline: false,             // use non-inline mode
  
  // OR if you need inline mode:
  table_toolbar: 
    'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter ' +
    'tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
});

option 3:
/* Force tox popup to never overlap table rows */
.tox-silver-sink .tox-pop {
  top: auto !important;
  bottom: calc(100% + 10px) !important;
  transform: none !important;
}

.tox-pop--top {
  inset: auto auto 0 0 !important;
}


          
