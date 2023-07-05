# Structurizr DSL Abacus Extension

An extension that provides these key features:

* Syntax highlighting support for [Structurizr DSL](https://github.com/structurizr/dsl)
* Allow content in Avolution Abacus to be used to create Structurizr files
* Allow content in Avolution Abacus to be used to generate Draw.io C4 diagrams directly
* Auto complete relevant data sections when writing up Structurizr C4 Model DSL files.
* Integration with Structurizr Lite to generate image files from DSL files.
* Integration with Draw.io to generate C4 diagrams from DSL files (coming soon)

## Features

Abacus browser that provides the ability to fetch entities from Abacus and then generate Structurizr files from any SoftwareSystem element.

Syntax highlighting following Structurizr convention for any file ending with the `DSL` extenstion.

This extension will provide automated completion of SourceSystem and Container data values when editing Structurizr diagram files.

It is possible to configure the mapping of Structurizr types to those held in your Abacus repository.

Any DSL model can be exported as a workspace file for a locally installed [Structurizr Lite](https://structurizr.com/help/lite) instance to process.

Where desired, C4 and normal PlantUML diagrams can be exports from Structurizr model built when creating models from Abacus browser.

With the addition of embedded Draw.io support C4 diagrams can be generated directly from Abacus or via Structrurizr DSL files.

## Extension System Context Diagram

![System Context](https://raw.githubusercontent.com/elsevierlabs-os/structurizr-dsl-abacus-extension/main/media/Structurizr-DSL-Abacus.png)

## Requirements

This extension only works with Avolution Abacus deployments that have the API enabled. Please check with your system administrator on the API status and what credentials you need to use to connect to the API.

>The API credentials are not the same as those you use to edit content in Abacus.

## Extension Settings

This extension contributes the following settings:

* `abacus.host`: the hostname of the Abacus instance with the API you need to connect to
* `abacus.port`: the port number of the API. Normally this is `443`
* `abacus.secure`: check this box if you want the enforce strict SSL rules
* `abacus.api`: The root URI of the API. By default Abacus sets this to `/API`
* `abacus.eeid`: The EEID of the architecture you want to query. There may be many architectures so ensure you use the correct one here. Failure to set a valid value will result in no matches
* `abacus.c4SoftwareSystem`: The component type that represents C4 Software Systems in Abacus
* `abacus.c4Container`: The component type that represents C4 Containers in Abacus
* `abacus.c4Component`: The component type that represents C4 Components in Abacus
* `abacus.c4Person`: The component type that represents C4 Person in Abacus
* `structurizrLite.workspaceLocation`: The folder where the DSL workspace file to be written for local Structurizr Lite to load
* `structurizrLite.server`: The URL of the local Structurizr Lite server used to fetch images from

## Known Issues

This is a pre-release version and thus will have any number of issues or defects. As this only reads from the Abacus API there is no risk to the repository but completion may be inconsistent at times.

## Release Notes

Here is a short summary of the key changes or updates of this release.

### 0.6.2

Fixed broken welcome message dialog.

### 0.6.1

Dependency updates and corrected change log.

### 0.6.0

First release under the Elsevier Open Source banner.

Introduction of embedded Draw.io capability.

### 0.5.1

Using Abacus EEID as variable names in Structurizr DSL files.

### 0.5.0

Added first version of integration with locally installed Structurizr Lite server for workspace to image rendering.

### 0.4.0

Added creation of C4 style PlantUML diagrams directly from Abacus Software System elements.

Various bug fixes.

### 0.3.0

Added activation of Abacus View when no DSL files are in the workspace.

Added creation of PlantUML diagrams directly from Abacus Software System elements.

### 0.2.1

Moved authentication to the Accounts capability in Visual Studio Code with a new Abacus Authentication Provider. This should provide for a more robust API connection handler.

### 0.2.0

Added Abacus browser and first version of Structurizr DSL auto generator.

### 0.1.3

Also will expand out Abacus entities when defining a container

### 0.1.2

Fixed some typographical errors and enhanced the README file

### 0.1.1

Initial release of Structurizr DSL Abacus Extension
