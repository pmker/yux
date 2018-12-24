(function(global){

    let pydio = global.pydio;

    class Callbacks{

        static share(){
            pydio.UI.openComponentInModal('ShareDialog', 'CompositeDialog', {pydio:pydio, selection:pydio.getUserSelection()});
        }
        
        static editShare(){
            pydio.UI.openComponentInModal('ShareDialog', 'CompositeDialog', {pydio:pydio, selection:pydio.getUserSelection()});
        }

        static loadList(){
            if(window.actionManager){
                window.actionManager.getDataModel().requireContextChange(window.actionManager.getDataModel().getRootNode(), true);
            }
        }
        
        static editFromList(){
            let dataModel;
            if(window.actionArguments && window.actionArguments.length){
                dataModel = window.actionArguments[0];
            }else if(window.actionManager){
                dataModel = window.actionManager.getDataModel();
            }
            pydio.UI.openComponentInModal('ShareDialog', 'MainPanel', {pydio:pydio, readonly:true, selection:dataModel});
        }

        static openUserShareView(){

            pydio.UI.openComponentInModal('ShareDialog', 'ShareViewModal', {
                pydio:pydio,
                currentUser:true,
                filters:{
                    parent_repository_id:"250",
                    share_type:"share_center.238"
                }
            });

        }

    }

    class Listeners{}

    global.ShareActions = {
        Callbacks:Callbacks,
        Listeners: Listeners
    };

})(window)