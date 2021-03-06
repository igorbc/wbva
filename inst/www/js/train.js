allowedModels = [
  "C5.0",
  "rpart2",
  "rpart1SE",
  "rpart",
  "avNNet",
  "nnet",
  "pcaNNet",
  "polr",
  "pls",
  "multinom",
  "rf",
  "C5.0Rules",
  "C5.0Tree"
];

loadModelInfo = function(){
    if(!chosenModel){
        alert("Load an .rds model from disk or select from the available");
        return false;
    }
    else{
        document.getElementById("loadModelInfoButton").classList.add("disabled");
        document.getElementById("loadingIcon").setAttribute("visible", true);
        console.log("will call getSingleModelInfo")
        var req = ocpu.call("getSingleModelInfo",
            {
                modelPath: curChosenModel,
            }, function(session)
            {
                session.getObject(processModelInfo);
           });

           //if R returns an error, alert the error message
           req.fail(function()
           {
               alert("Server error: " + req.responseText);
           });

           req.always(function()
           {
               document.getElementById("loadModelInfoButton").classList.remove("disabled");
               document.getElementById("loadingIcon").setAttribute("visible", false);
           });
    }
}

callTrain = function(){
    if(dm.fullData){
        train(dm.fullData);
    }
    else{
        if(dm.isClassified){
            alert("The current data is already classified and the original data is not available.");
        }
        else{
            train(dm.data);
        }
    }
}

useModel = function(data, vary){
    if(!chosenModel){
        alert("Load an .rds model from disk or select from the available");
        return false;
    }
    else{
        document.getElementById("useModelButton").classList.add("disabled");
        document.getElementById("loadingIcon").setAttribute("visible", true);

        var req = ocpu.call("useModel",
            {
                ds: data,
                modelPath: curChosenModel,
            }, function(session)
            {
                classificationSessions.add(session);

                session.getObject(function(data){
                    console.log(data);

                    if(vary){
                        dm.vData = data;
                        dm.computePartialDependency();
                        pdPlot.createPdPlots(
                            "#pdpArea",
                            "#pdpLine",
                            dm.pdData,
                            dm.classNames,
                            vc.colorScheme);
                    }
                    else{
                        sa.destroyCurrent();
                        vc.createAcApContainers();
                        vc.colorScheme = sa.getClassColorScheme();
                        useFile(data);
                    }
                });
           });

           //if R returns an error, alert the error message
           req.fail(function()
           {
               alert("Server error: " + req.responseText);
           });

           req.always(function()
           {
               document.getElementById("useModelButton").classList.remove("disabled");
               document.getElementById("loadingIcon").setAttribute("visible", false);
           });
    }
}

train = function(data){
    /*
    if(isFileClassified){
        alert("This file aready contains information about classification results.\n" +
        "Use another file.");
        return false;
    }
    */


    var selector = document.getElementById("methodSelector");
    if(selector.selectedIndex == 0){
        alert("Choose a method first.");
        return false;
    }

    var method = selector.options[selector.selectedIndex].value;
    console.log("method: " + method);

    document.getElementById("trainButton").classList.add("disabled");
    document.getElementById("loadingIcon").setAttribute("visible", true);
    var splitRatio = document.getElementById("trainTestSplit").value / 100;

    var req = ocpu.call("ml",
       {
           ds: data,
           mlMethod: method,
           modelPath: "",
           splitRatio: splitRatio
       }, function(session)
       {
           trainSessions.add(session, method, curDataFileName);

           session.getObject(function(data){
               console.log(data);

               sa.destroyCurrent();
               vc.createAcApContainers();
               vc.colorScheme = sa.getClassColorScheme();
               useFile(data);
           });

           addModelToOptions();
       });

       //if R returns an error, alert the error message
       req.fail(function()
       {
           alert("Server error: " + req.responseText);
       });

       req.always(function()
       {
           document.getElementById("trainButton").classList.remove("disabled");
           document.getElementById("loadingIcon").setAttribute("visible", false);
       });
}

methodSelected = function(event){
    //alert(this.selectedIndex + " " + this.options[this.selectedIndex].text);
}

modelSelected = function(event){
    document.getElementById("chosenModel").innerHTML = this.options[this.selectedIndex].text;
    curChosenModel = trainSessions.getFullFilePath(this.value);
    document.getElementById("saveModel").href = trainSessions.getLastDownloadPath();
    document.getElementById("saveModel").classList.remove("disabled");
    document.getElementById("useModelButton").classList.remove("disabled");
    console.log(curChosenModel);
}

var allMethods;
getAllModelsInfo = function(){

    document.getElementById("loadingIcon").setAttribute("visible", true);
    var req = ocpu.call("getModelsInfo",
       {
       }, function(session)
       {
           session.getObject(function(data){
               //console.log(data);
               var selector = document.getElementById("methodSelector");
               var methods = data[0];
               var attrInfo = data[1];
               methods.sort(function(a, b){
                  var x = a.label.toLowerCase();
                  var y = b.label.toLowerCase();
                  if (x < y) {return -1;}
                  if (x > y) {return 1;}
                  return 0;
               });
               allMethods = methods;
               for (i=0; i<methods.length; i++){
                 if(allowedModels.includes(methods[i].name)) {
                   var o = document.createElement("option");
                   o.value = methods[i].name;
                   o.innerHTML = methods[i].label + " (" + methods[i].name + ")";
                   selector.appendChild(o);
                 }
               }
               selector.value = "rpart"
           });
       });

       //if R returns an error, alert the error message
       req.fail(function()
       {
           console.log("Server error: " + req.responseText);
           //alert("Server error: " + req.responseText);

       });
       req.always(function(){
           document.getElementById("loadingIcon").setAttribute("visible", false);
       });
   return(null);
}

addModelToOptions = function(){
    var selector = document.getElementById("modelSelector");
    var o = document.createElement("option");
    o.value = trainSessions.count - 1;
    o.innerHTML = trainSessions.getLastModelStr();
    selector.appendChild(o);

}
